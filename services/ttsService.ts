
import { ModelSettings, TTSProvider, ModelProvider } from '../types';
import { GoogleGenAI, Modality } from "@google/genai";

export class TTSService {
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  
  // Session ID to track active playback requests and handle cancellation
  private currentSessionId = 0;

  // Cache for preloaded audio buffers: Key -> Promise<AudioBuffer | Blob>
  private audioCache = new Map<string, Promise<AudioBuffer | string>>();

  // Singleton instance
  private static _instance: TTSService;
  public static get instance() {
    if (!this._instance) this._instance = new TTSService();
    return this._instance;
  }

  /**
   * Initialize AudioContext (must be called from a user gesture)
   */
  public async init() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Preload audio for the next chunk
   */
  public preload(text: string, settings: ModelSettings): void {
    // Browser TTS doesn't need preloading
    if (settings.ttsProvider === TTSProvider.BROWSER) return;

    const key = this.getCacheKey(text, settings);
    if (this.audioCache.has(key)) return;

    // Start fetching and store the promise
    const promise = this.fetchAudioData(text, settings).catch(err => {
      console.warn("Preload failed", err);
      this.audioCache.delete(key);
      throw err;
    });

    this.audioCache.set(key, promise);
  }

  /**
   * Stop all currently playing audio and invalidate pending requests
   */
  public stop() {
    this.currentSessionId++; // Invalidate any pending async operations
    
    // Clear cache to free memory and prevent playing stale content
    this.audioCache.clear();

    // Browser
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    this.currentUtterance = null;

    // Web Audio (Google)
    if (this.currentSource) {
      try { this.currentSource.stop(); } catch (e) {}
      this.currentSource = null;
    }

    // HTML Audio (OpenAI)
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
  }

  /**
   * Set playback rate for currently playing audio (if supported)
   */
  public setRate(rate: number) {
    if (this.currentSource) {
      try { this.currentSource.playbackRate.value = rate; } catch(e) {}
    }
    if (this.currentAudio) {
      this.currentAudio.playbackRate = rate;
    }
    // Browser TTS typically requires a restart to change rate
  }

  /**
   * Speak the given text using the configured provider
   */
  public async speak(text: string, settings: ModelSettings, speed: number = 1.0): Promise<void> {
    // 1. Stop any existing audio (but don't clear cache yet as we might need the hit)
    // Actually speak() implies a new "turn", but in our loop we call speak() sequentially.
    // The playNext loop in GameStage handles the flow. 
    // We only stop the *previous* sound here by stopping source, but we don't call this.stop() 
    // because that clears the cache.
    
    // Invalidate previous operations of *this* specific playback slot, 
    // but we need to be careful not to kill the *current* session if speak is called in a loop?
    // No, speak is called sequentially.
    
    // To ensure we stop previous sounds (e.g. if user clicked prev/next rapidly),
    // we should stop the hardware sources manually without nuking the session ID globally if not needed.
    // BUT, the design is that speak() blocks until done.
    
    // For simplicity, we assume speak() is called when the channel is free or to preempt.
    if (this.currentSource) { try { this.currentSource.stop(); } catch(e){} this.currentSource = null; }
    if (this.currentAudio) { this.currentAudio.pause(); this.currentAudio = null; }
    if (this.currentUtterance) { window.speechSynthesis.cancel(); this.currentUtterance = null; }

    const sessionId = this.currentSessionId;

    return new Promise(async (resolve, reject) => {
      const safeResolve = () => resolve();

      try {
        if (settings.ttsProvider === TTSProvider.GOOGLE) {
          await this.playGoogle(text, settings, speed, safeResolve, sessionId);
        } else if (settings.ttsProvider === TTSProvider.OPENAI) {
          await this.playOpenAI(text, settings, speed, safeResolve, sessionId);
        } else {
          this.playBrowser(text, settings.ttsVoice, speed, safeResolve, sessionId);
        }
      } catch (e) {
        console.error("TTS Service Error:", e);
        safeResolve(); 
      }
    });
  }

  // --- Implementations ---

  private playBrowser(text: string, voiceName: string, rate: number, onEnd: () => void, sessionId: number) {
    if (this.currentSessionId !== sessionId) { onEnd(); return; }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = rate;
    
    if (voiceName) {
        const voices = window.speechSynthesis.getVoices();
        // Strict match: prioritize exact name
        const found = voices.find(v => v.name === voiceName);
        if (found) {
            utterance.voice = found;
        } else {
            // Optional: Fallback logic?
            // If user explicitly asked for a voice that doesn't exist, we fallback to system default 
            // by NOT setting utterance.voice, instead of forcing a random zh-CN voice.
            // This avoids the 'male/female mismatch' if the browser picks a different default than what user 'expected' via a broken setting.
            // But if users switch browsers, the voice name in local storage might be invalid. 
            // In that case, using system default (usually auto-detected lang) is safer.
        }
    }
    
    if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
             window.speechSynthesis.onvoiceschanged = null;
        };
    }

    utterance.onend = () => {
        if (this.currentSessionId === sessionId) onEnd();
    };
    utterance.onerror = () => {
      if (this.currentSessionId === sessionId) onEnd();
    };
    
    this.currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  private async playGoogle(text: string, settings: ModelSettings, rate: number, onEnd: () => void, sessionId: number) {
    if (this.currentSessionId !== sessionId) { onEnd(); return; }

    // Try cache first
    const key = this.getCacheKey(text, settings);
    let bufferPromise = this.audioCache.get(key) as Promise<AudioBuffer> | undefined;

    if (!bufferPromise) {
        // Not in cache, fetch now
        bufferPromise = this.fetchAudioData(text, settings) as Promise<AudioBuffer>;
        this.audioCache.set(key, bufferPromise);
    }

    try {
        const audioBuffer = await bufferPromise;
        
        // Remove from cache after retrieving to save memory (consumed)
        this.audioCache.delete(key);

        if (this.currentSessionId !== sessionId) { onEnd(); return; }

        await this.init();
        if (!this.audioContext) throw new Error("AudioContext missing");

        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.playbackRate.value = rate;
        source.connect(this.audioContext.destination);
        source.onended = () => {
            if (this.currentSessionId === sessionId) {
                this.currentSource = null;
                onEnd();
            }
        };
        
        this.currentSource = source;
        source.start();

    } catch (error) {
        console.error("Google TTS Playback failed", error);
        this.audioCache.delete(key);
        onEnd();
    }
  }

  private async playOpenAI(text: string, settings: ModelSettings, rate: number, onEnd: () => void, sessionId: number) {
      if (this.currentSessionId !== sessionId) { onEnd(); return; }

      const key = this.getCacheKey(text, settings);
      let blobUrlPromise = this.audioCache.get(key) as Promise<string> | undefined;

      if (!blobUrlPromise) {
          blobUrlPromise = this.fetchAudioData(text, settings) as Promise<string>;
          this.audioCache.set(key, blobUrlPromise);
      }

      try {
          const url = await blobUrlPromise;
          this.audioCache.delete(key);

          if (this.currentSessionId !== sessionId) { 
              URL.revokeObjectURL(url);
              onEnd(); 
              return; 
          }

          const audio = new Audio(url);
          audio.playbackRate = rate;
          
          audio.onended = () => {
            URL.revokeObjectURL(url);
            if (this.currentSessionId === sessionId) {
                this.currentAudio = null;
                onEnd();
            }
          };
          audio.onerror = (e) => {
            console.error("Audio playback error", e);
            URL.revokeObjectURL(url);
            if (this.currentSessionId === sessionId) onEnd();
          };
          
          this.currentAudio = audio;
          await audio.play();

      } catch (e) {
          console.error("OpenAI playback failed", e);
          this.audioCache.delete(key);
          onEnd();
      }
  }

  // --- Fetch Helpers ---

  private getCacheKey(text: string, settings: ModelSettings): string {
      return `${settings.ttsProvider}:${settings.ttsVoice || 'default'}:${text.substring(0, 50)}_${text.length}`;
  }

  private async fetchAudioData(text: string, settings: ModelSettings): Promise<AudioBuffer | string> {
      if (settings.ttsProvider === TTSProvider.GOOGLE) {
          const effectiveKey = settings.ttsApiKey 
          || (settings.provider === ModelProvider.GOOGLE ? settings.apiKey : undefined) 
          || process.env.API_KEY;

          if (!effectiveKey) throw new Error("Need API Key for Google TTS.");
          
          await this.init();
          if (!this.audioContext) throw new Error("AudioContext not initialized");

          const ai = new GoogleGenAI({ apiKey: effectiveKey });
          const voiceName = settings.ttsVoice || 'Puck';

          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-tts',
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName }
                }
                }
            }
          });

          const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          if (!base64Audio) throw new Error("No audio data returned from Gemini.");

          return this.decodeAudioData(
            this.decodeBase64(base64Audio),
            this.audioContext
          );

      } else if (settings.ttsProvider === TTSProvider.OPENAI) {
          const apiKey = settings.ttsApiKey || (settings.provider === ModelProvider.CUSTOM ? settings.apiKey : undefined);
          const baseUrl = settings.ttsBaseUrl || (settings.provider === ModelProvider.CUSTOM ? settings.baseUrl : undefined) || 'https://api.openai.com/v1';
          
          if (!apiKey) throw new Error("Need API Key for OpenAI TTS.");

          const response = await fetch(`${baseUrl}/audio/speech`, {
            method: 'POST',
            headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            },
            body: JSON.stringify({
            model: 'tts-1',
            input: text,
            voice: settings.ttsVoice || 'alloy',
            // Note: OpenAI burns speed into the file. We apply it again in Audio element? 
            // Ideally we request 1.0 here and use playbackRate on Audio element for dynamic control.
            speed: 1.0 
            })
          });

          if (!response.ok) {
            throw new Error(`OpenAI API Error: ${response.status}`);
          }

          const blob = await response.blob();
          return URL.createObjectURL(blob);
      }
      
      throw new Error("Invalid provider for fetchAudioData");
  }

  private decodeBase64(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  private async decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number = 24000,
    numChannels: number = 1
  ): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  }
}
