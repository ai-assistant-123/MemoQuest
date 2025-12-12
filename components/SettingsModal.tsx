

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
    window.speechSynthesis.onvoiceschanged = loadVoices;
    
    return () => { window.speechSynthesis.onvoiceschanged = null; };
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

  // 调用平台提供的 API Key 选择器 (仅 Google 模式)
  const handleGoogleKeySelect = async () => {
    if (window.aistudio?.openSelectKey) {
      try {
        await window.aistudio.openSelectKey();
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
              <Globe size={16} className="text-blue-500 dark:text-blue-400" /> 文字生成模型 (Visual Clues)
            </label>
            <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setLocalSettings(prev => ({ ...prev, provider: ModelProvider.GOOGLE, modelId: PRESET_GOOGLE_MODELS[0].id }))}
                className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${
                  localSettings.provider === ModelProvider.GOOGLE
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800'
                }`}
              >
                Google Gemini
              </button>
              <button
                type="button"
                onClick={() => setLocalSettings(prev => ({ ...prev, provider: ModelProvider.CUSTOM, modelId: '', baseUrl: 'https://api.openai.com/v1' }))}
                className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${
                  localSettings.provider === ModelProvider.CUSTOM
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800'
                }`}
              >
                OpenAI Compatible
              </button>
            </div>
          </div>

           {/* --- Configuration based on Provider --- */}
           {localSettings.provider === ModelProvider.GOOGLE ? (
            /* Google Settings */
            <div className="space-y-4 animate-fade-in pl-2 border-l-2 border-indigo-500/50 dark:border-indigo-900/50">
               <div>
                <label className="block text-gray-500 dark:text-gray-400 text-xs font-bold mb-2">模型版本</label>
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
          ) : (
             /* Custom Settings */
             <div className="space-y-4 animate-fade-in pl-2 border-l-2 border-emerald-500/50 dark:border-emerald-900/50">
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-500 dark:text-gray-400 text-xs font-bold mb-2">Base URL</label>
                    <input 
                      type="text" 
                      value={localSettings.baseUrl || ''}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, baseUrl: e.target.value }))}
                      placeholder="https://api.openai.com/v1"
                      className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm text-gray-900 dark:text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-500 dark:text-gray-400 text-xs font-bold mb-2">Model ID</label>
                    <input 
                      type="text" 
                      value={localSettings.modelId}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, modelId: e.target.value }))}
                      placeholder="gpt-4o"
                      className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm text-gray-900 dark:text-white font-mono"
                    />
                  </div>
               </div>
             </div>
          )}

           {/* --- API Key Section (Shared) --- */}
           <div>
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-3 flex items-center gap-2">
                  <Key size={16} className="text-yellow-500 dark:text-yellow-400" /> API Key (主模型)
              </label>
              
              {localSettings.provider === ModelProvider.GOOGLE && (
                <div className="mb-3">
                   <Button 
                    onClick={handleGoogleKeySelect} 
                    variant="secondary" 
                    size="sm" 
                    className="w-full flex items-center justify-center gap-2 border-gray-300 dark:border-gray-600 text-xs"
                    disabled={!window.aistudio}
                  >
                    <Key size={14} /> 
                    {window.aistudio ? "从 Google AI Studio 选择 Key (推荐)" : "环境托管不可用"}
                    {window.aistudio && <ExternalLink size={12} />}
                  </Button>
                </div>
              )}

              <input 
                  type="password" 
                  value={localSettings.apiKey || ''}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                  placeholder={localSettings.provider === ModelProvider.GOOGLE ? "或粘贴 Gemini API Key..." : "sk-..."}
                  className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-mono"
              />
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
                { id: TTSProvider.OPENAI, label: 'OpenAI' },
                { id: TTSProvider.MINIMAX, label: 'MiniMax' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setLocalSettings(prev => ({ 
                    ...prev, 
                    ttsProvider: opt.id as TTSProvider, 
                    ttsVoice: opt.id === TTSProvider.GOOGLE ? 'Puck' : 
                              opt.id === TTSProvider.OPENAI ? 'alloy' : 
                              opt.id === TTSProvider.MINIMAX ? 'audiobook_male_1' : '' 
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
                  <label className="block text-gray-500 dark:text-gray-400 text-xs font-bold mb-2 flex items-center gap-1">
                      <Mic size={12} /> 选择浏览器语音 (Browser Voice)
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
                    若列表为空，请尝试刷新页面或检查浏览器支持。Safari/Chrome 的本地语音库不同。
                  </p>
              </div>
            )}

            {/* MiniMax Settings */}
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
                    <div>
                      <label className="block text-gray-500 dark:text-gray-400 text-xs font-bold mb-2 flex items-center gap-1">
                        <Cpu size={12} /> Model ID
                      </label>
                      <select 
                          value={localSettings.minimaxModel || 'speech-2.6-hd'}
                          onChange={(e) => setLocalSettings(prev => ({ ...prev, minimaxModel: e.target.value }))}
                          className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm text-gray-900 dark:text-white"
                      >
                          <option value="speech-2.6-hd">speech-2.6-hd (超低延时)</option>
                          <option value="speech-2.6-turbo">speech-2.6-turbo (极速)</option>
                          <option value="speech-02-hd">speech-02-hd (高韵律)</option>
                      </select>
                    </div>
                     <div>
                      <label className="block text-gray-500 dark:text-gray-400 text-xs font-bold mb-2 flex items-center gap-1">
                        <Mic size={12} /> Voice ID
                      </label>
                      <input 
                        type="text" 
                        value={localSettings.minimaxVoice || 'audiobook_male_1'}
                        onChange={(e) => setLocalSettings(prev => ({ ...prev, minimaxVoice: e.target.value }))}
                        placeholder="audiobook_male_1"
                        className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm text-gray-900 dark:text-white font-mono"
                      />
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
                  <div className="flex items-center text-xs text-gray-500 pt-2 border-t border-gray-200 dark:border-gray-700/50">
                    <p>
                      提示: MiniMax 异步 API 适用于长文本，每次朗读需要等待生成（Create Task -> Poll -> Download）。
                    </p>
                  </div>
              </div>
            )}

            {/* Remote API Settings (OpenAI / Google) */}
            {(localSettings.ttsProvider === TTSProvider.OPENAI || localSettings.ttsProvider === TTSProvider.GOOGLE) && (
               <div className="bg-gray-100 dark:bg-gray-900/30 p-4 rounded-lg border border-gray-200 dark:border-gray-700 animate-fade-in space-y-4">
                  <div>
                    <label className="block text-gray-500 dark:text-gray-400 text-xs font-bold mb-2 flex items-center gap-1">
                      <Mic size={12} /> 音色名称 (Voice)
                    </label>
                    <input 
                      type="text" 
                      value={localSettings.ttsVoice}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, ttsVoice: e.target.value }))}
                      placeholder={localSettings.ttsProvider === TTSProvider.GOOGLE ? "Puck, Kore, Charon..." : "alloy, echo, fable..."}
                      className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm text-gray-900 dark:text-white font-mono"
                    />
                     <p className="text-[10px] text-gray-500 mt-1">
                       {localSettings.ttsProvider === TTSProvider.GOOGLE 
                          ? "可用: Puck, Charon, Kore, Fenrir, Zephyr"
                          : "可用: alloy, echo, fable, onyx, nova, shimmer"}
                     </p>
                  </div>
                  
                  {/* Dedicated TTS Key/URL Inputs for OpenAI */}
                  {localSettings.ttsProvider === TTSProvider.OPENAI && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                           <label className="block text-gray-500 dark:text-gray-400 text-xs font-bold mb-2 flex items-center gap-1">
                             <Key size={12} /> TTS API Key
                             <span className="text-gray-600 font-normal ml-auto">(若不同于主 Key)</span>
                           </label>
                           <input 
                             type="password" 
                             value={localSettings.ttsApiKey || ''}
                             onChange={(e) => setLocalSettings(prev => ({ ...prev, ttsApiKey: e.target.value }))}
                             placeholder="sk-..."
                             className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm text-gray-900 dark:text-white font-mono"
                           />
                        </div>
                         <div className="col-span-2">
                           <label className="block text-gray-500 dark:text-gray-400 text-xs font-bold mb-2 flex items-center gap-1">
                             <Server size={12} /> TTS Base URL
                             <span className="text-gray-600 font-normal ml-auto">(可选)</span>
                           </label>
                           <input 
                             type="text" 
                             value={localSettings.ttsBaseUrl || ''}
                             onChange={(e) => setLocalSettings(prev => ({ ...prev, ttsBaseUrl: e.target.value }))}
                             placeholder="https://api.openai.com/v1"
                             className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm text-gray-900 dark:text-white font-mono"
                           />
                        </div>
                      </div>
                    </>
                  )}
                  
                  {localSettings.ttsProvider === TTSProvider.GOOGLE && (
                    <div className="col-span-2">
                        <label className="block text-gray-500 dark:text-gray-400 text-xs font-bold mb-2 flex items-center gap-1">
                          <Key size={12} /> Google API Key
                          <span className="text-gray-600 font-normal ml-auto">(留空则尝试使用主 Key 或环境 Key)</span>
                        </label>
                        <input 
                          type="password" 
                          value={localSettings.ttsApiKey || ''}
                          onChange={(e) => setLocalSettings(prev => ({ ...prev, ttsApiKey: e.target.value }))}
                          placeholder="Gemini API Key..."
                          className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm text-gray-900 dark:text-white font-mono"
                        />
                    </div>
                  )}

                  <div className="flex items-center text-xs text-gray-500 pt-2 border-t border-gray-200 dark:border-gray-700/50">
                    <p>
                      注意：使用 API TTS 会产生额外费用。播放速度控制在 API 模式下也同样生效。
                    </p>
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