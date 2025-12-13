
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
   * Stop all currently playing audio and invalidate pending requests
   */
  public stop() {
    this.currentSessionId++; // Invalidate any pending async operations
    
    // Resolve pending promise immediately to prevent hanging await chains
    if (this.currentResolve) {
        this.currentResolve();
        this.currentResolve = null;
    }
    
    // Clear cache to free memory and prevent playing stale content
    this.audioCache.clear();

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
          // All other providers (Google, OpenAI, MiniMax) now use Web Audio Buffer
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
   * Unified Player for Audio Buffers (Google, OpenAI, MiniMax)
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

      } else if (settings.ttsProvider === TTSProvider.OPENAI) {
          const apiKey = settings.ttsApiKey || (settings.provider === ModelProvider.CUSTOM ? settings.apiKey : undefined);
          const baseUrl = this.getCleanBaseUrl(settings.ttsBaseUrl || (settings.provider === ModelProvider.CUSTOM ? settings.baseUrl : undefined) || 'https://api.openai.com/v1');
          
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
            speed: 1.0 
            })
          });

          if (!response.ok) {
            throw new Error(`OpenAI API Error: ${response.status}`);
          }

          const blob = await response.blob();
          return this.blobToAudioBuffer(blob);

      } else if (settings.ttsProvider === TTSProvider.MINIMAX) {
          return this.fetchMiniMaxAudio(text, settings);
      }
      
      throw new Error("Invalid provider for fetchAudioData");
  }

  /**
   * MiniMax Async TTS Implementation
   * Workflow: Create Task -> Poll Status -> Download File -> Decode to Buffer
   */
  private async fetchMiniMaxAudio(text: string, settings: ModelSettings): Promise<AudioBuffer> {
    const apiKey = settings.minimaxApiKey;
    const baseUrl = this.getCleanBaseUrl(settings.minimaxBaseUrl);
    
    if (!apiKey) throw new Error("Need API Key for MiniMax TTS.");

    // 1. Create Task
    let createRes;
    try {
        createRes = await fetch(`${baseUrl}/t2a_async_v2`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: settings.minimaxModel || 'speech-2.6-hd',
                text: text,
                voice_setting: {
                    voice_id: settings.minimaxVoice || 'audiobook_male_1',
                    speed: 1, 
                    vol: 10,
                    pitch: 0
                },
                audio_setting: {
                    audio_sample_rate: 32000,
                    format: "mp3",
                    channel: 2
                }
            })
        });
    } catch (e) {
        throw new Error(`MiniMax Create Request Failed (Network): ${e}`);
    }

    if (!createRes.ok) {
        throw new Error(`MiniMax Create Task Failed: ${createRes.status} ${await createRes.text()}`);
    }

    const createData = await createRes.json();
    const taskId = createData.task_id;
    if (!taskId) throw new Error("MiniMax did not return a task_id");

    // 2. Poll Status
    let fileId: string | null = null;
    let attempts = 0;
    const maxAttempts = 120; // Allow up to 2 minutes for generation

    while (!fileId && attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 300)); // Faster polling
      attempts++;

      try {
          const queryRes = await fetch(`${baseUrl}/query/t2a_async_query_v2?task_id=${taskId}`, {
            headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            }
          });
          
          if (queryRes.ok) {
            const queryData = await queryRes.json();
            
            let taskInfo = queryData;
            // Handle array tasks wrapper if present (Standard V2 format)
            if (queryData.tasks && Array.isArray(queryData.tasks) && queryData.tasks.length > 0) {
                taskInfo = queryData.tasks[0];
            }

            const status = taskInfo.status; 
            
            if (status === 'Success' || status === 'success') { 
                fileId = taskInfo.file_id;
            } else if (status === 'Failed' || status === 'failed') {
                throw new Error(`MiniMax Task Failed: ${JSON.stringify(taskInfo)}`);
            }
          } else {
            console.warn(`MiniMax Poll encountered error ${queryRes.status}, retrying...`);
          }
      } catch (e) {
          console.warn("MiniMax Poll Network Error (ignoring one failure):", e);
      }
    }

    if (!fileId) {
      throw new Error(`MiniMax TTS Timed out waiting for generation. (TaskID: ${taskId})`);
    }

    // 3. Download File
    let fileRes;
    try {
        fileRes = await fetch(`${baseUrl}/files/retrieve_content?file_id=${fileId}`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });
    } catch (e) {
        throw new Error(`MiniMax Retrieve Request Failed (Network): ${e}`);
    }

    if (!fileRes.ok) {
       throw new Error(`MiniMax Retrieve Failed: ${fileRes.status}`);
    }
    
    // Safety check: Ensure we didn't get a JSON error disguised as a file
    const contentType = fileRes.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        const errJson = await fileRes.json();
        throw new Error(`MiniMax Retrieve returned JSON instead of Audio: ${JSON.stringify(errJson)}`);
    }

    const blob = await fileRes.blob();
    if (blob.size < 100) {
        throw new Error(`MiniMax Retrieve returned invalid file (size: ${blob.size}).`);
    }

    // 4. Decode to AudioBuffer
    return this.blobToAudioBuffer(blob);
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
