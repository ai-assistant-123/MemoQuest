import React, { useState, useEffect } from 'react';
import { X, Settings, Key, ExternalLink, Server, Globe, Volume2, Mic, Moon, Sun, Check, Cpu } from 'lucide-react';
import { Button } from './Button';
import { PRESET_GOOGLE_MODELS, ModelSettings, ModelProvider, TTSProvider, Theme } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ModelSettings;
  onSettingsChange: (settings: ModelSettings) => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  settings, 
  onSettingsChange,
  theme,
  onThemeChange
}) => {
  // 本地状态，用于在点击确认前暂存修改
  const [localSettings, setLocalSettings] = useState<ModelSettings>(settings);
  // 记录打开时的初始主题，用于取消时回滚
  const [initialTheme, setInitialTheme] = useState<Theme>(theme);
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);

  // 当弹窗打开时，同步到本地状态并记录初始主题
  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
      setInitialTheme(theme);
    }
    // 仅在 isOpen 变化时触发，避免 theme 变化导致重置
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // 加载浏览器语音列表
  useEffect(() => {
    const loadVoices = () => {
      // 安全检查：防止在不支持 SpeechSynthesis 的环境（如部分 Android WebView）中崩溃
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        return;
      }

      const voices = window.speechSynthesis.getVoices();
      
      // 去重：基于 voice.name
      const uniqueMap = new Map<string, SpeechSynthesisVoice>();
      voices.forEach(v => {
        if (!uniqueMap.has(v.name)) {
          uniqueMap.set(v.name, v);
        }
      });
      const uniqueVoices = Array.from(uniqueMap.values());

      // 排序：中文优先，然后按名称排序
      const sorted = uniqueVoices.sort((a, b) => {
        const aZh = a.lang.includes('zh');
        const bZh = b.lang.includes('zh');
        if (aZh && !bZh) return -1;
        if (!aZh && bZh) return 1;
        return a.name.localeCompare(b.name);
      });
      setBrowserVoices(sorted);
    };

    loadVoices();
    
    // 安全绑定事件
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    
    return () => { 
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null; 
      }
    };
  }, []);

  if (!isOpen) return null;

  // 关闭（取消）处理：回滚主题
  const handleClose = () => {
    if (theme !== initialTheme) {
      onThemeChange(initialTheme);
    }
    onClose();
  };

  // 保存处理：提交设置修改，保留当前主题
  const handleSave = () => {
    onSettingsChange(localSettings);
    onClose();
  };

  // 安全检查 window.aistudio 是否存在
  const aistudioAvailable = typeof window !== 'undefined' && !!(window as any).aistudio;

  // 调用平台提供的 API Key 选择器 (仅 Google 模式)
  const handleGoogleKeySelect = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio?.openSelectKey) {
      try {
        await aistudio.openSelectKey();
      } catch (e) {
        console.error("Failed to open key selector", e);
      }
    } else {
      alert("当前环境不支持手动配置 API Key。");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 border-4 border-gray-200 dark:border-gray-600 rounded-xl w-full max-w-lg shadow-2xl flex flex-col animate-slide-up max-h-[90vh] overflow-hidden transition-colors duration-300">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <h3 className="text-xl text-cyan-600 dark:text-cyan-400 font-bold game-font flex items-center gap-2">
            <Settings size={20} /> 设置
          </h3>
          <button 
            id="btn-settings-close"
            onClick={handleClose} 
            className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 p-1 rounded-full transition-all"
            aria-label="关闭"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar">
          
          {/* --- Theme Toggle --- */}
          <div>
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-3 flex items-center gap-2">
               {theme === 'dark' ? <Moon size={16} className="text-indigo-400" /> : <Sun size={16} className="text-amber-500" />} 
               界面主题 (Theme)
            </label>
            <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
              <button
                id="btn-theme-light"
                type="button"
                onClick={() => onThemeChange('light')}
                className={`flex-1 py-2 text-sm font-bold rounded-md transition-all flex items-center justify-center gap-2 ${
                  theme === 'light'
                    ? 'bg-white text-gray-900 shadow ring-1 ring-gray-200'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                <Sun size={16} /> 日间 (Day)
              </button>
              <button
                id="btn-theme-dark"
                type="button"
                onClick={() => onThemeChange('dark')}
                className={`flex-1 py-2 text-sm font-bold rounded-md transition-all flex items-center justify-center gap-2 ${
                  theme === 'dark'
                    ? 'bg-gray-700 text-white shadow'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                <Moon size={16} /> 夜间 (Night)
              </button>
            </div>
          </div>

          <div className="h-px bg-gray-200 dark:bg-gray-700 my-4"></div>

          {/* --- LLM Provider Selection --- */}
          <div>
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-3 flex items-center gap-2">
              <Globe size={16} className="text-blue-500 dark:text-blue-400" /> 文本合成
            </label>
            <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-lg border border-gray-200 dark:border-gray-700 mb-4">
              <button
                type="button"
                onClick={() => setLocalSettings(prev => ({ ...prev, provider: ModelProvider.GOOGLE, modelId: PRESET_GOOGLE_MODELS[0].id }))}
                className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${
                  localSettings.provider === ModelProvider.GOOGLE
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800'
                }`}
              >
                Gemini
              </button>
              <button
                type="button"
                onClick={() => setLocalSettings(prev => ({ ...prev, provider: ModelProvider.CUSTOM, modelId: '', baseUrl: '' }))}
                className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${
                  localSettings.provider === ModelProvider.CUSTOM
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800'
                }`}
              >
                OpenAI Compatible
              </button>
            </div>

             {/* --- Configuration based on Provider (Unified Layout) --- */}
             {localSettings.provider === ModelProvider.GOOGLE ? (
              /* Google Settings */
              <div className="bg-gray-100 dark:bg-gray-900/30 p-4 rounded-lg border border-gray-200 dark:border-gray-700 animate-fade-in space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                     <div className="col-span-2">
                        <label className="block text-gray-500 dark:text-gray-400 text-xs font-bold mb-2 flex items-center gap-1">
                          <Key size={12} /> API Key
                        </label>
                        <div className="mb-2">
                            <Button 
                              onClick={handleGoogleKeySelect} 
                              variant="secondary" 
                              size="sm" 
                              className="w-full flex items-center justify-center gap-2 border-gray-300 dark:border-gray-600 text-xs"
                              disabled={!aistudioAvailable}
                            >
                              <Key size={14} /> 
                              {aistudioAvailable ? "从 Google AI Studio 选择" : "环境托管不可用"}
                              {aistudioAvailable && <ExternalLink size={12} />}
                            </Button>
                        </div>
                        <input 
                            type="password" 
                            value={localSettings.apiKey || ''}
                            onChange={(e) => setLocalSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                            placeholder="手动粘贴 Gemini API Key..."
                            className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm text-gray-900 dark:text-white font-mono focus:ring-1 focus:ring-indigo-500"
                        />
                     </div>
                     
                     <div className="col-span-2">
                      <label className="block text-gray-500 dark:text-gray-400 text-xs font-bold mb-2 flex items-center gap-1">
                        <Cpu size={12} /> Model Version
                      </label>
                      <select 
                        value={localSettings.modelId}
                        onChange={(e) => setLocalSettings(prev => ({ ...prev, modelId: e.target.value }))}
                        className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                      >
                         {PRESET_GOOGLE_MODELS.map((m) => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                         ))}
                      </select>
                     </div>
                 </div>
              </div>
            ) : (
               /* Custom Settings */
               <div className="bg-gray-100 dark:bg-gray-900/30 p-4 rounded-lg border border-gray-200 dark:border-gray-700 animate-fade-in space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-gray-500 dark:text-gray-400 text-xs font-bold mb-2 flex items-center gap-1">
                        <Key size={12} /> API Key
                      </label>
                      <input 
                        type="password" 
                        value={localSettings.apiKey || ''}
                        onChange={(e) => setLocalSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                        placeholder="sk-..."
                        className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm text-gray-900 dark:text-white font-mono focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-gray-500 dark:text-gray-400 text-xs font-bold mb-2 flex items-center gap-1">
                        <Server size={12} /> Base URL
                      </label>
                      <input 
                        type="text" 
                        value={localSettings.baseUrl || ''}
                        onChange={(e) => setLocalSettings(prev => ({ ...prev, baseUrl: e.target.value }))}
                        placeholder="https://api.openai.com/v1"
                        className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm text-gray-900 dark:text-white font-mono focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-gray-500 dark:text-gray-400 text-xs font-bold mb-2 flex items-center gap-1">
                        <Cpu size={12} /> Model ID
                      </label>
                      <input 
                        type="text" 
                        value={localSettings.modelId}
                        onChange={(e) => setLocalSettings(prev => ({ ...prev, modelId: e.target.value }))}
                        placeholder="gpt-4o"
                        className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm text-gray-900 dark:text-white font-mono focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                 </div>
              </div>
            )}
          </div>

          <div className="h-px bg-gray-200 dark:bg-gray-700 my-4"></div>

          {/* --- TTS Settings --- */}
          <div>
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-3 flex items-center gap-2">
              <Volume2 size={16} className="text-pink-500 dark:text-pink-400" /> 语音合成 (TTS)
            </label>
            <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-lg border border-gray-200 dark:border-gray-700 mb-4 overflow-x-auto">
              {[
                { id: TTSProvider.BROWSER, label: '浏览器原生' },
                { id: TTSProvider.GOOGLE, label: 'Gemini' },
                { id: TTSProvider.MINIMAX, label: 'MiniMax' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setLocalSettings(prev => ({ 
                    ...prev, 
                    ttsProvider: opt.id as TTSProvider, 
                    ttsVoice: opt.id === TTSProvider.GOOGLE ? 'Puck' : 
                              opt.id === TTSProvider.MINIMAX ? 'female-shaonv' : '' 
                  }))}
                  className={`flex-1 px-3 py-2 text-xs md:text-sm font-bold rounded-md transition-all whitespace-nowrap ${
                    localSettings.ttsProvider === opt.id
                      ? 'bg-pink-600 text-white shadow'
                      : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Browser Voice Selector */}
            {localSettings.ttsProvider === TTSProvider.BROWSER && (
              <div className="bg-gray-100 dark:bg-gray-900/30 p-4 rounded-lg border border-gray-200 dark:border-gray-700 animate-fade-in mt-4">
                 <div className="grid grid-cols-2 gap-4">
                     <div className="col-span-2">
                        <label className="block text-gray-500 dark:text-gray-400 text-xs font-bold mb-2 flex items-center gap-1">
                            <Mic size={12} /> 选择浏览器语音
                        </label>
                        <select
                            value={localSettings.ttsVoice}
                            onChange={(e) => setLocalSettings(prev => ({ ...prev, ttsVoice: e.target.value }))}
                            className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                        >
                            <option value="">-- 系统默认 (System Default) --</option>
                            {browserVoices.map((v) => (
                                <option key={v.name} value={v.name}>
                                    {v.name} ({v.lang})
                                </option>
                            ))}
                        </select>
                        <p className="text-[10px] text-gray-500 mt-2">
                            若列表为空，请尝试刷新页面或检查浏览器支持。
                        </p>
                    </div>
                 </div>
              </div>
            )}

            {/* MiniMax Settings (Already Unified Format) */}
            {localSettings.ttsProvider === TTSProvider.MINIMAX && (
              <div className="bg-gray-100 dark:bg-gray-900/30 p-4 rounded-lg border border-gray-200 dark:border-gray-700 animate-fade-in space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-gray-500 dark:text-gray-400 text-xs font-bold mb-2 flex items-center gap-1">
                        <Key size={12} /> MiniMax API Key
                      </label>
                      <input 
                        type="password" 
                        value={localSettings.minimaxApiKey || ''}
                        onChange={(e) => setLocalSettings(prev => ({ ...prev, minimaxApiKey: e.target.value }))}
                        placeholder="ey..."
                        className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm text-gray-900 dark:text-white font-mono"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-gray-500 dark:text-gray-400 text-xs font-bold mb-2 flex items-center gap-1">
                        <Cpu size={12} /> Model ID
                      </label>
                      <select 
                          value={localSettings.minimaxModel || 'speech-2.6-hd'}
                          onChange={(e) => setLocalSettings(prev => ({ ...prev, minimaxModel: e.target.value }))}
                          className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm text-gray-900 dark:text-white"
                      >
                          <option value="speech-2.6-hd">speech-2.6-hd (最新高拟真)</option>
                          <option value="speech-2.6-turbo">speech-2.6-turbo (极速)</option>
                          <option value="speech-02-hd">speech-02-hd (通用高质)</option>
                          <option value="speech-02-turbo">speech-02-turbo (通用极速)</option>
                          <option value="speech-01-hd">speech-01-hd (经典高质)</option>
                          <option value="speech-01-turbo">speech-01-turbo (经典极速)</option>
                      </select>
                    </div>
                     <div className="col-span-2">
                      <label className="block text-gray-500 dark:text-gray-400 text-xs font-bold mb-2 flex items-center gap-1">
                        <Mic size={12} /> Voice ID
                      </label>
                      <input 
                        type="text" 
                        value={localSettings.minimaxVoice || 'female-shaonv'}
                        onChange={(e) => setLocalSettings(prev => ({ ...prev, minimaxVoice: e.target.value }))}
                        placeholder="female-shaonv"
                        className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm text-gray-900 dark:text-white font-mono"
                      />
                      <div className="text-[10px] text-gray-500 mt-1 flex flex-wrap gap-1 items-center">
                        <a 
                          href="https://platform.minimaxi.com/docs/faq/system-voice-id" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 underline flex items-center gap-0.5"
                        >
                          系统音色列表 <ExternalLink size={10} />
                        </a>
                      </div>
                    </div>
                     <div className="col-span-2">
                       <label className="block text-gray-500 dark:text-gray-400 text-xs font-bold mb-2 flex items-center gap-1">
                         <Server size={12} /> Base URL (Optional)
                       </label>
                       <input 
                         type="text" 
                         value={localSettings.minimaxBaseUrl || ''}
                         onChange={(e) => setLocalSettings(prev => ({ ...prev, minimaxBaseUrl: e.target.value }))}
                         placeholder="https://api.minimaxi.com/v1"
                         className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm text-gray-900 dark:text-white font-mono"
                       />
                    </div>
                  </div>
              </div>
            )}

            {/* Remote API Settings (Google) - Unified Layout */}
            {localSettings.ttsProvider === TTSProvider.GOOGLE && (
               <div className="bg-gray-100 dark:bg-gray-900/30 p-4 rounded-lg border border-gray-200 dark:border-gray-700 animate-fade-in space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-gray-500 dark:text-gray-400 text-xs font-bold mb-2 flex items-center gap-1">
                          <Mic size={12} /> Voice Name
                        </label>
                        <input 
                          type="text" 
                          value={localSettings.ttsVoice}
                          onChange={(e) => setLocalSettings(prev => ({ ...prev, ttsVoice: e.target.value }))}
                          placeholder="Puck, Kore, Charon..."
                          className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm text-gray-900 dark:text-white font-mono"
                        />
                         <div className="text-[10px] text-gray-500 mt-1 flex flex-wrap gap-1 items-center">
                            <a 
                                href="https://ai.google.dev/gemini-api/docs/speech-generation?hl=zh-cn#voices" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 underline flex items-center gap-0.5"
                            >
                                语音选项 <ExternalLink size={10} />
                            </a>
                         </div>
                      </div>
                      
                      <div className="col-span-2">
                            <label className="block text-gray-500 dark:text-gray-400 text-xs font-bold mb-2 flex items-center gap-1">
                              <Key size={12} /> Google API Key
                            </label>
                            <input 
                              type="password" 
                              value={localSettings.ttsApiKey || ''}
                              onChange={(e) => setLocalSettings(prev => ({ ...prev, ttsApiKey: e.target.value }))}
                              placeholder="留空则尝试使用主模型 Key..."
                              className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm text-gray-900 dark:text-white font-mono"
                            />
                        </div>
                   </div>
               </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <Button 
            onClick={handleSave} 
            variant="primary" 
            size="lg"
            className="w-full flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transform active:scale-[0.98] transition-all"
          >
            <Check size={22} strokeWidth={2.5} />
            保存设置
          </Button>
        </div>
      </div>
    </div>
  );
};