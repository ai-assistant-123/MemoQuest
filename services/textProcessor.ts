import { Token, GameLevel } from '../types';

// 添加 Intl.Segmenter 的类型定义，以支持默认不包含此 API 定义的 TypeScript 环境。
declare global {
  namespace Intl {
    class Segmenter {
      constructor(locales?: string | string[], options?: { granularity: 'grapheme' | 'word' | 'sentence' });
      segment(input: string): IterableIterator<{ segment: string; index: number; input: string; isWordLike?: boolean }>;
    }
  }
}

const PUNCTUATION_REGEX = /[，。！？；：,.!?;:]/;
const NEWLINE_REGEX = /\n/;

// 检查浏览器是否支持 Intl.Segmenter
const hasSegmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl;

export const processText = (text: string, level: GameLevel): Token[] => {
  if (hasSegmenter) {
    return processWithSegmenter(text, level);
  }
  // 针对旧环境的回退方案
  return processCharByChar(text, level);
};

// 使用 Intl.Segmenter 进行分词处理的逻辑
const processWithSegmenter = (text: string, level: GameLevel): Token[] => {
  const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'word' });
  const segments = segmenter.segment(text);
  
  const tokens: Token[] = [];
  
  // 第一级状态：交替显示单词 (确定性逻辑)
  let l1_shouldHide = false; // 从显示第一个单词开始

  // 第二级状态：句末隐藏
  let l2_wordsSincePunctuation = 0;

  // 第三级状态：仅段首可见
  let l3_isStartOfLine = true;

  for (const segment of segments) {
    const { segment: word, isWordLike } = segment;
    const isPunctuation = PUNCTUATION_REGEX.test(word);
    const isNewline = NEWLINE_REGEX.test(word);
    const isWhitespace = !word.trim();

    let shouldHideSegment = false;

    // --- 逻辑路由 (针对每个分词/单词) ---
    switch (level) {
      case GameLevel.LEVEL_1:
        // 如果是单词，且非标点、非换行、非空白
        if (isWordLike && !isPunctuation && !isNewline && !isWhitespace) {
          if (l1_shouldHide) {
            shouldHideSegment = true;
          }
          // 切换状态，实现严格交替 (显示一个，隐藏一个)
          l1_shouldHide = !l1_shouldHide;
        }
        break;

      case GameLevel.LEVEL_2:
        if (isNewline || isPunctuation) {
          l2_wordsSincePunctuation = 0;
        } else if (isWordLike && !isWhitespace) {
          // 保留第一个词 (索引 0)。隐藏后续的词。
          if (l2_wordsSincePunctuation >= 1) {
            shouldHideSegment = true;
          }
          l2_wordsSincePunctuation++;
        }
        break;

      case GameLevel.LEVEL_3:
        if (isNewline) {
          l3_isStartOfLine = true;
        } else if (isWordLike && !isWhitespace) {
          if (l3_isStartOfLine) {
            l3_isStartOfLine = false; 
            // 保持此分段可见 (整个第一个词)
          } else {
            shouldHideSegment = true;
          }
        }
        break;
        
      default:
        shouldHideSegment = false;
    }

    // --- 将单词分段转换为字符 Token ---
    // 我们仍然逐字符渲染以保持网格效果，
    // 但可见性由父级分段决定。
    const chars = word.split('');
    chars.forEach((char) => {
      const charIsPunct = PUNCTUATION_REGEX.test(char);
      const charIsNewline = NEWLINE_REGEX.test(char);
      const charIsSpace = char === ' ';
      
      let charHidden = shouldHideSegment;

      // 始终显示标点/结构字符
      if (charIsPunct || charIsNewline || charIsSpace) {
        charHidden = false;
      }

      tokens.push({
        id: `t-${tokens.length}-${Date.now()}`,
        char: char,
        isHidden: charHidden,
        isRevealed: false,
        isPunctuation: charIsPunct,
        isNewline: charIsNewline
      });
    });
  }

  return tokens;
};

// 回退逻辑 (基于字符)
const processCharByChar = (text: string, level: GameLevel): Token[] => {
  const chars = text.split('');
  
  let l1_counter = 0;
  let l1_target = 2; // 固定目标，用于确定性行为
  let l1_hiding = false;
  let l2_charsSincePunctuation = 0;
  let l3_isStartOfLine = true;

  return chars.map((char, index) => {
    const isPunctuation = PUNCTUATION_REGEX.test(char);
    const isNewline = NEWLINE_REGEX.test(char);
    let shouldHide = false;

    switch (level) {
      case GameLevel.LEVEL_1:
        if (!isNewline && !isPunctuation && char !== ' ') {
          if (l1_hiding) shouldHide = true;
          l1_counter++;
          if (l1_counter >= l1_target) {
            l1_counter = 0;
            l1_hiding = !l1_hiding;
            // 此处不再随机改变 l1_target
          }
        }
        break;

      case GameLevel.LEVEL_2:
        if (isNewline || isPunctuation) {
            l2_charsSincePunctuation = 0;
        } else if (char !== ' ') {
            if (l2_charsSincePunctuation >= 2) shouldHide = true; // 回退逻辑：保留2个字符
            l2_charsSincePunctuation++;
        }
        break;

      case GameLevel.LEVEL_3:
        if (isNewline) {
            l3_isStartOfLine = true;
        } else if (char !== ' ' && !isPunctuation) {
            if (l3_isStartOfLine) {
                l3_isStartOfLine = false;
            } else {
                shouldHide = true;
            }
        }
        break;
    }

    if (isPunctuation || isNewline || char === ' ') {
      shouldHide = false; 
    }

    return {
      id: `char-${index}-${Date.now()}`,
      char,
      isHidden: shouldHide,
      isRevealed: false,
      isPunctuation,
      isNewline
    };
  });
};