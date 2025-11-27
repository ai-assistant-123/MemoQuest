export enum GameLevel {
  INPUT = 0,
  LEVEL_1 = 1, // 间隔隐藏 (Interleave)
  LEVEL_2 = 2, // 标点后隐藏 (Hide after punctuation)
  LEVEL_3 = 3, // 仅保留段首 (Hide all except paragraph start)
}

export interface Token {
  id: string;
  char: string;
  isHidden: boolean; // 是否被游戏逻辑遮挡？
  isRevealed: boolean; // 用户是否手动揭示了？
  isPunctuation: boolean;
  isNewline: boolean;
}

export interface GameState {
  rawText: string;
  level: GameLevel;
}