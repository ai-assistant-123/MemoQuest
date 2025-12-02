
import React, { useState, useEffect } from 'react';
import { X, Settings, Key, Cpu, ExternalLink, Server, Globe } from 'lucide-react';
import { Button } from './Button';
import { PRESET_GOOGLE_MODELS, ModelSettings, ModelProvider } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ModelSettings;
  onSettingsChange: (settings: ModelSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  settings, 
  onSettingsChange 
}) => {
  // 本地状态，用于在点击确认前暂存修改
  const [localSettings, setLocalSettings] = useState<ModelSettings>(settings);

  // 当弹窗打开或外部 settings 变化时，同步到本地状态
  useEffect(() => {
    setLocalSettings(settings);
  }, [isOpen, settings]);

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-gray-800 border-4 border-gray-600 rounded-xl w-full max-w-lg shadow-2xl flex flex-col animate-slide-up max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-900/50">
          <h3 className="text-xl text-cyan-400 font-bold game-font flex items-center gap-2">
            <Settings size={20} /> 设置
          </h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white hover:bg-gray-700 p-1 rounded-full transition-all"
            aria-label="关闭"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar">
          
          {/* 1. Provider Selection */}
          <div>
            <label className="block text-gray-300 text-sm font-bold mb-3 flex items-center gap-2">
              <Globe size={16} className="text-blue-400" /> 服务提供商
            </label>
            <div className="flex bg-gray-900 p-1 rounded-lg border border-gray-700">
              <button
                type="button"
                onClick={() => setLocalSettings(prev => ({ ...prev, provider: ModelProvider.GOOGLE, modelId: PRESET_GOOGLE_MODELS[0].id, apiKey: '' }))}
                className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${
                  localSettings.provider === ModelProvider.GOOGLE
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                Google Gemini
              </button>
              <button
                type="button"
                onClick={() => setLocalSettings(prev => ({ ...prev, provider: ModelProvider.CUSTOM, modelId: '', baseUrl: 'https://api.openai.com/v1', apiKey: '' }))}
                className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${
                  localSettings.provider === ModelProvider.CUSTOM
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                其他厂商 (OpenAI)
              </button>
            </div>
          </div>

          {/* 2. Configuration based on Provider */}
          {localSettings.provider === ModelProvider.GOOGLE ? (
            /* --- Google Settings --- */
            <div className="space-y-6 animate-fade-in">
              <div>
                <label className="block text-gray-300 text-sm font-bold mb-3 flex items-center gap-2">
                  <Cpu size={16} className="text-indigo-400" /> 模型选择
                </label>
                <div className="space-y-2">
                  {PRESET_GOOGLE_MODELS.map((m) => (
                    <label 
                      key={m.id} 
                      className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                        localSettings.modelId === m.id 
                          ? 'bg-indigo-900/30 border-indigo-500' 
                          : 'bg-gray-900/50 border-gray-700 hover:border-gray-500'
                      }`}
                    >
                      <input
                        type="radio"
                        name="google-model"
                        value={m.id}
                        checked={localSettings.modelId === m.id}
                        onChange={(e) => setLocalSettings(prev => ({ ...prev, modelId: e.target.value }))}
                        className="w-4 h-4 text-indigo-500 focus:ring-indigo-500 bg-gray-800 border-gray-600"
                      />
                      <span className={`ml-3 text-sm ${localSettings.modelId === m.id ? 'text-white font-bold' : 'text-gray-300'}`}>
                        {m.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-bold mb-3 flex items-center gap-2">
                  <Key size={16} className="text-yellow-400" /> API Key (Google)
                </label>
                
                {/* 方式 1: 自动托管 (推荐) */}
                <div className="bg-gray-900/30 p-4 rounded-lg border border-gray-700 mb-4">
                  <div className="mb-3">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">方式 1: 自动托管 (官方推荐)</span>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      通过 Google AI Studio 安全连接项目，无需手动复制 Key。
                    </p>
                  </div>
                  <Button 
                    onClick={handleGoogleKeySelect} 
                    variant="secondary" 
                    size="sm" 
                    className="w-full flex items-center justify-center gap-2 border-gray-600"
                    disabled={!window.aistudio}
                  >
                    <Key size={14} /> 
                    {window.aistudio ? "选择 / 切换 Google 项目" : "环境托管不可用"}
                    {window.aistudio && <ExternalLink size={12} />}
                  </Button>
                </div>

                {/* 方式 2: 手动输入 */}
                <div className="bg-gray-900/30 p-4 rounded-lg border border-gray-700">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">方式 2: 手动输入</span>
                    <input 
                      type="password" 
                      value={localSettings.apiKey || ''}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                      placeholder="在此处粘贴 Gemini API Key (AIza...)"
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none placeholder-gray-600 font-mono"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                        如果通过上方按钮无法选择现有的 Key，请直接在此处粘贴。手动输入的 Key 优先级高于自动托管 Key。
                    </p>
                </div>
              </div>
            </div>
          ) : (
            /* --- Custom / OpenAI Settings --- */
            <div className="space-y-6 animate-fade-in">
              <div className="bg-emerald-900/20 p-3 rounded-lg border border-emerald-900/50 text-xs text-emerald-200/80 mb-4">
                支持 OpenAI, DeepSeek, Moonshot 等兼容 OpenAI 接口协议的服务。
                <br/>数据将直接发送至您配置的服务器，不会经过 Google 服务器。
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2 flex items-center gap-2">
                  <Server size={16} className="text-emerald-400" /> API Base URL
                </label>
                <input 
                  type="text" 
                  value={localSettings.baseUrl || ''}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, baseUrl: e.target.value }))}
                  placeholder="https://api.openai.com/v1"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none placeholder-gray-600 font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">接口地址，通常以 /v1 结尾。</p>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2 flex items-center gap-2">
                  <Cpu size={16} className="text-emerald-400" /> Model ID
                </label>
                <input 
                  type="text" 
                  value={localSettings.modelId}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, modelId: e.target.value }))}
                  placeholder="e.g. gpt-4o, deepseek-chat"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none placeholder-gray-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2 flex items-center gap-2">
                  <Key size={16} className="text-yellow-400" /> API Key
                </label>
                <input 
                  type="password" 
                  value={localSettings.apiKey || ''}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                  placeholder="sk-..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none placeholder-gray-600 font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">仅保存在本地浏览器内存中，刷新后可能需要重新输入。</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 bg-gray-900/50 flex justify-end gap-3">
          <Button onClick={onClose} variant="secondary" size="sm">
            取消
          </Button>
          <Button onClick={handleSave} variant="primary" size="sm">
            保存并应用
          </Button>
        </div>
      </div>
    </div>
  );
};
