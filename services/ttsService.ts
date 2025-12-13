

import { ModelSettings, TTSProvider, ModelProvider } from '../types';
import { GoogleGenAI, Modality } from "@google/genai";

export class TTSService {
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  
  // Session ID to track active playback requests and handle cancellation
  private currentSessionId = 0;
  
  // Track current promise resolver to prevent hanging chains if stopped abruptly
  private currentResolve: (() => void) | null = null;

  // Cache for preloaded audio buffers: Key -> Promise<AudioBuffer>
  private audioCache = new Map<string, Promise<AudioBuffer>>();

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
  public preload(text: string, settings: ModelSettings, uniqueId?: string): void {
    // Browser TTS doesn't need preloading
    if (settings.ttsProvider === TTSProvider.BROWSER) return;
    if (!text || !text.trim()) return;

    const key = this.getCacheKey(text, settings, uniqueId);
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
   * Manually clear the cache if needed (e.g., changing global settings)
   */
  public clearCache() {
    this.audioCache.clear();
  }

  /**
   * Stop all currently playing audio and invalidate pending requests
   */
  public stop() {
    this.currentSessionId++; // Invalidate any pending async operations
    
    // Resolve pending promise immediately to prevent hanging await chains
    if (this.currentResolve) {
        this.currentResolve();
        this.currentResolve = null;
    }
    
    // NOTE: Do NOT clear audioCache here. 
    // Clearing cache invalidates preloaded chunks for future steps (e.g. in Auto Demo),
    // causing playback delays. 
    // The cache is self-cleaning: playBuffer() deletes entries after consumption.
    // Unconsumed preloaded chunks are small enough to keep until page refresh.

    // Browser
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    this.currentUtterance = null;

    // Web Audio (All Providers now use this)
    if (this.currentSource) {
      try { this.currentSource.stop(); } catch (e) {}
      this.currentSource = null;
    }
  }

  /**
   * Set playback rate for currently playing audio (if supported)
   */
  public setRate(rate: number) {
    if (this.currentSource) {
      try { this.currentSource.playbackRate.value = rate; } catch(e) {}
    }
    // Browser TTS typically requires a restart to change rate
  }

  /**
   * Speak the given text using the configured provider
   */
  public async speak(text: string, settings: ModelSettings, speed: number = 1.0, uniqueId?: string, onPlayStart?: () => void): Promise<void> {
    if (!text || !text.trim()) {
        return Promise.resolve();
    }

    // 1. Resolve previous promise if exists (to prevent deadlocks)
    if (this.currentResolve) {
        this.currentResolve();
        this.currentResolve = null;
    }

    // 2. Stop any existing audio resources
    if (this.currentSource) { try { this.currentSource.stop(); } catch(e){} this.currentSource = null; }
    
    if (this.currentUtterance) { 
        window.speechSynthesis.cancel(); 
        this.currentUtterance = null; 
        // Safari fix: Add a small delay after cancellation
        if (settings.ttsProvider === TTSProvider.BROWSER) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }

    const sessionId = this.currentSessionId;

    return new Promise(async (resolve, reject) => {
      this.currentResolve = resolve;

      const safeResolve = () => {
         if (this.currentResolve === resolve) {
             this.currentResolve = null;
         }
         resolve();
      };

      try {
        if (settings.ttsProvider === TTSProvider.BROWSER) {
          this.playBrowser(text, settings.ttsVoice, speed, safeResolve, sessionId, onPlayStart);
        } else {
          // All other providers (Google, MiniMax) now use Web Audio Buffer
          await this.playBuffer(text, settings, speed, safeResolve, sessionId, uniqueId, onPlayStart);
        }
      } catch (e) {
        console.error("TTS Service Error:", e);
        safeResolve(); 
      }
    });
  }

  // --- Implementations ---

  private playBrowser(text: string, voiceName: string, rate: number, onEnd: () => void, sessionId: number, onPlayStart?: () => void) {
    if (this.currentSessionId !== sessionId) { onEnd(); return; }

    // Safari fix: Resume synthesis if paused
    if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = rate;
    
    if (voiceName) {
        const voices = window.speechSynthesis.getVoices();
        const found = voices.find(v => v.name === voiceName);
        if (found) {
            utterance.voice = found;
        }
    }
    
    // Ensure voices are loaded (mainly for first run)
    if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
             window.speechSynthesis.onvoiceschanged = null;
        };
    }

    let isFinished = false;
    let startTimeoutId: ReturnType<typeof setTimeout>;
    
    const finish = () => {
        if (isFinished) return;
        isFinished = true;
        
        clearTimeout(endTimeoutId);
        clearTimeout(startTimeoutId);
        
        if (this.currentUtterance === utterance) {
            this.currentUtterance = null;
        }
        
        if (this.currentSessionId === sessionId) onEnd();
    };

    // 1. Safety Timeout: If audio never ends (browser hang), force finish after 5s or estimated duration
    const timeoutDuration = Math.max(5000, text.length * 500);
    const endTimeoutId = setTimeout(() => {
        if (this.currentSessionId === sessionId && !isFinished) {
            console.warn("Browser TTS (End) timed out, forcing next step");
            window.speechSynthesis.cancel();
            finish();
        }
    }, timeoutDuration);

    // 2. Start Timeout: If onstart never fires (Safari silent failure), force finish quickly (800ms)
    // This solves the "stuck at loading" issue where speech request is dropped.
    let hasStarted = false;
    startTimeoutId = setTimeout(() => {
        if (this.currentSessionId === sessionId && !hasStarted && !isFinished) {
            console.warn("Browser TTS (Start) timed out - silent failure detected, skipping.");
            window.speechSynthesis.cancel();
            finish();
        }
    }, 800);

    utterance.onstart = () => {
        hasStarted = true;
        clearTimeout(startTimeoutId);
        onPlayStart?.();
    };

    utterance.onend = finish;
    utterance.onerror = (e) => {
        finish();
    };
    
    this.currentUtterance = utterance;
    
    // Use setTimeout to push speak to next tick, helps with Safari race conditions
    setTimeout(() => {
        if (this.currentSessionId === sessionId) {
            window.speechSynthesis.speak(utterance);
        }
    }, 10);
  }

  /**
   * Unified Player for Audio Buffers (Google, MiniMax)
   */
  private async playBuffer(text: string, settings: ModelSettings, rate: number, onEnd: () => void, sessionId: number, uniqueId?: string, onPlayStart?: () => void) {
    if (this.currentSessionId !== sessionId) { onEnd(); return; }

    // Try cache first
    const key = this.getCacheKey(text, settings, uniqueId);
    let bufferPromise = this.audioCache.get(key);

    if (!bufferPromise) {
        // Not in cache, fetch now
        bufferPromise = this.fetchAudioData(text, settings);
        this.audioCache.set(key, bufferPromise);
    }

    try {
        const audioBuffer = await bufferPromise;
        this.audioCache.delete(key); // Remove from cache after consumption to save memory

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
        onPlayStart?.();
        source.start();

    } catch (error) {
        console.warn("TTS Fetch failed (Quota/Network), falling back to Browser TTS", error);
        this.audioCache.delete(key);
        
        // Fallback: Use browser TTS
        // We use the 'rate' passed in. Voice is ignored (uses system default) to ensure it works.
        this.playBrowser(text, '', rate, onEnd, sessionId, onPlayStart);
    }
  }

  // --- Fetch Helpers ---

  private getCacheKey(text: string, settings: ModelSettings, uniqueId?: string): string {
      const base = `${settings.ttsProvider}:${settings.ttsVoice || settings.minimaxVoice || 'default'}:${text.substring(0, 50)}`;
      // If uniqueId is provided (e.g. chunk index), use it to differentiate identical texts
      return uniqueId ? `${base}:${uniqueId}` : `${base}:${text.length}`;
  }

  // Clean URL helper
  private getCleanBaseUrl(url?: string): string {
    let base = url || 'https://api.minimaxi.com/v1';
    // Remove trailing slash
    if (base.endsWith('/')) {
        base = base.slice(0, -1);
    }
    // Remove /v1 suffix if present, as specific calls append it
    if (base.endsWith('/v1')) {
        base = base.slice(0, -3);
    }
    return base;
  }

  private async blobToAudioBuffer(blob: Blob): Promise<AudioBuffer> {
    await this.init();
    if (!this.audioContext) throw new Error("AudioContext not initialized");
    const arrayBuffer = await blob.arrayBuffer();
    return await this.audioContext.decodeAudioData(arrayBuffer);
  }

  private async fetchAudioData(text: string, settings: ModelSettings): Promise<AudioBuffer> {
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

      } else if (settings.ttsProvider === TTSProvider.MINIMAX) {
          return this.fetchMiniMaxAudio(text, settings);
      }
      
      throw new Error("Invalid provider for fetchAudioData");
  }

  /**
   * MiniMax V2 Synchronous TTS Implementation
   * Uses POST /v1/t2a_v2 for faster latency (no polling).
   * Includes retry logic for Rate Limits (429) and Voice ID fallbacks.
   */
  private async fetchMiniMaxAudio(text: string, settings: ModelSettings): Promise<AudioBuffer> {
    const apiKey = settings.minimaxApiKey;
    const baseUrl = this.getCleanBaseUrl(settings.minimaxBaseUrl);
    
    if (!apiKey) throw new Error("Need API Key for MiniMax TTS.");

    const maxRetries = 3;
    let currentVoiceId = settings.minimaxVoice || 'female-shaonv';
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(`${baseUrl}/v1/t2a_v2`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: settings.minimaxModel || 'speech-2.6-hd',
                text: text,
                stream: false,
                voice_setting: {
                    voice_id: currentVoiceId,
                    speed: 1, 
                    vol: 1,
                    pitch: 0
                },
                audio_setting: {
                    sample_rate: 32000,
                    bitrate: 128000,
                    format: "mp3",
                    channel: 1
                }
            })
        });

        // 1. Handle HTTP Rate Limit (429)
        if (response.status === 429) {
             throw new Error("MiniMax Service Error: rate limit");
        }

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`MiniMax API Error: ${response.status} ${errText}`);
        }

        const json = await response.json();
        
        // 2. Handle JSON Error Responses
        if (json.base_resp && json.base_resp.status_code !== 0) {
            const msg = json.base_resp.status_msg || "";
            throw new Error(`MiniMax Service Error: ${msg}`);
        }

        const hexAudio = json.data?.audio;
        if (!hexAudio) {
             throw new Error("MiniMax returned no audio data.");
        }

        const bytes = this.hexToUint8Array(hexAudio);
        return await this.decodeAudioData(bytes, this.audioContext!, 32000);

      } catch (e: any) {
        lastError = e;
        const errMsg = (e.message || "").toLowerCase();

        // Retry Strategy: Rate Limit
        if (errMsg.includes("rate limit") && attempt < maxRetries) {
             const delay = 1000 * Math.pow(2, attempt) + Math.random() * 500;
             console.warn(`MiniMax Rate Limit hit. Retrying in ${delay}ms... (Attempt ${attempt + 1})`);
             await new Promise(resolve => setTimeout(resolve, delay));
             continue;
        }

        // Retry Strategy: Voice ID not exist -> Try Fallback Voice (only once)
        if (errMsg.includes("voice id not exist") && attempt < maxRetries) {
            // If the current failed voice is not the safe fallback, try the safe fallback
            const safeFallback = 'male-qn-qingse'; // Common standard voice
            if (currentVoiceId !== safeFallback) {
                console.warn(`MiniMax Voice ID '${currentVoiceId}' invalid. Retrying with fallback '${safeFallback}'...`);
                currentVoiceId = safeFallback;
                // Add a small delay just in case
                await new Promise(resolve => setTimeout(resolve, 500));
                continue;
            }
        }

        throw e; // Non-retryable error
      }
    }
    throw lastError;
  }

  private hexToUint8Array(hexString: string): Uint8Array {
      if (hexString.length % 2 !== 0) {
          throw new Error("Invalid hex string");
      }
      const bytes = new Uint8Array(hexString.length / 2);
      for (let i = 0; i < hexString.length; i += 2) {
          bytes[i / 2] = parseInt(hexString.substr(i, 2), 16);
      }
      return bytes;
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
    if (dataInt16.length === 0) {
        return ctx.createBuffer(1, 1, sampleRate); 
    }

    try {
        const bufferCopy = data.buffer.slice(0);
        return await ctx.decodeAudioData(bufferCopy);
    } catch (e) {
        // Fallback for raw PCM
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
}