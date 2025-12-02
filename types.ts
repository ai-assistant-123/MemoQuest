
export enum GameLevel {
  INPUT = 0,
  LEVEL_1 = 1, // 间隔隐藏 (Interleave): 类似于完形填空，隔一个词隐藏一个
  LEVEL_2 = 2, // 标点后隐藏 (Hide after punctuation): 仅显示句首，隐藏其余部分直到标点
  LEVEL_3 = 3, // 仅保留段首 (Hide all except paragraph start): 仅显示段落第一个词，其余全隐
}

// 单词/字符的揭示状态枚举
export enum RevealState {
  HIDDEN_X = 0,    // 初始状态：显示 'X' 占位符
  HIDDEN_ICON = 1, // 中间状态：显示 Emoji 图标 (如果有 AI 生成的线索)
  REVEALED = 2     // 最终状态：显示原始文字
}

// 核心数据结构：Token (代表一个字符或标点)
export interface Token {
  id: string;             // 唯一标识符
  char: string;           // 实际字符
  isHidden: boolean;      // 逻辑属性：根据当前游戏等级，该字符是否应该被“遮挡”
  revealState: RevealState; // 交互属性：用户当前把这个字符点到了什么状态 (X/图标/明文)
  isPunctuation: boolean; // 是否为标点符号 (通常不隐藏)
  isNewline: boolean;     // 是否为换行符 (用于布局控制)
}

// 全局游戏状态接口
export interface GameState {
  rawText: string;
  level: GameLevel;
}

// 字号等级对应的 Tailwind CSS 类名数组
export const FONT_SIZE_CLASSES = [
  'text-sm',      // 0
  'text-base',    // 1
  'text-lg',      // 2 (Default)
  'text-xl',      // 3
  'text-2xl',     // 4
  'text-3xl',     // 5
  'text-4xl',     // 6
];

// 模型提供商枚举
export enum ModelProvider {
  GOOGLE = 'google',
  CUSTOM = 'custom', // OpenAI Compatible (DeepSeek, Moonshot, Local, etc.)
}

// 模型配置接口
export interface ModelSettings {
  provider: ModelProvider;
  modelId: string;
  // Custom Provider Fields
  baseUrl?: string;
  apiKey?: string;
}

// 预设的 Google 模型列表
export const PRESET_GOOGLE_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (快速)' },
  { id: 'gemini-2.5-flash-latest', name: 'Gemini 2.5 Flash Latest' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro (智能)' },
];

export const DEFAULT_MODEL_SETTINGS: ModelSettings = {
  provider: ModelProvider.GOOGLE,
  modelId: PRESET_GOOGLE_MODELS[0].id,
};

// 扩展 Window 接口以支持 AI Studio 特定 API
declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey(): Promise<boolean>;
      openSelectKey(): Promise<void>;
    };
  }
}
