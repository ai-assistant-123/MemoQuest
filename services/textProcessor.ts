
import { Token, GameLevel, RevealState } from '../types';

// 添加 Intl.Segmenter 的类型定义，以支持默认不包含此 API 定义的 TypeScript 环境。
// Intl.Segmenter 是浏览器原生支持的国际化分词 API，对中文分词支持较好。
declare global {
  namespace Intl {
    class Segmenter {
      constructor(locales?: string | string[], options?: { granularity: 'grapheme' | 'word' | 'sentence' });
      segment(input: string): IterableIterator<{ segment: string; index: number; input: string; isWordLike?: boolean }>;
    }
  }
}

// 用于识别标点符号的正则
const PUNCTUATION_REGEX = /[，。！？；：,.!?;:]/;
// 用于识别换行符的正则
const NEWLINE_REGEX = /\n/;

// 检查浏览器环境是否支持 Intl.Segmenter
const hasSegmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl;

/**
 * 主处理函数：将原始文本转换为 Token 数组
 * @param text 用户输入的原始文本
 * @param level 当前游戏难度等级
 */
export const processText = (text: string, level: GameLevel): Token[] => {
  // 优先使用浏览器原生的高级分词 API
  if (hasSegmenter) {
    return processWithSegmenter(text, level);
  }
  // 如果浏览器不支持，降级到基于字符的简单处理
  return processCharByChar(text, level);
};

// --- 核心逻辑：使用 Intl.Segmenter 进行分词处理 ---
const processWithSegmenter = (text: string, level: GameLevel): Token[] => {
  // 初始化中文分词器，粒度为 'word' (词)
  const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'word' });
  const segments = segmenter.segment(text);
  
  const tokens: Token[] = [];
  
  // Level 1 状态：控制间隔隐藏 (true=隐藏, false=显示)
  let l1_shouldHide = false; 

  // Level 2 状态：记录标点符号后经过了多少个词
  let l2_wordsSincePunctuation = 0;

  // Level 3 状态：标记是否处于段落开头
  let l3_isStartOfLine = true;

  // 遍历分词结果
  for (const segment of segments) {
    const { segment: word, isWordLike } = segment;
    const isPunctuation = PUNCTUATION_REGEX.test(word);
    const isNewline = NEWLINE_REGEX.test(word);
    const isWhitespace = !word.trim();

    let shouldHideSegment = false; // 默认不隐藏

    // --- 核心算法：根据难度等级决定当前词是否隐藏 ---
    switch (level) {
      case GameLevel.LEVEL_1:
        // 间隔隐藏策略：针对非标点、非换行、非空白的实词
        if (isWordLike && !isPunctuation && !isNewline && !isWhitespace) {
          if (l1_shouldHide) {
            shouldHideSegment = true;
          }
          // 切换状态，实现严格交替 (显示一个，隐藏一个)
          l1_shouldHide = !l1_shouldHide;
        }
        break;

      case GameLevel.LEVEL_2:
        // 句末隐藏策略：
        if (isNewline || isPunctuation) {
          // 遇到标点或换行，计数器重置
          l2_wordsSincePunctuation = 0;
        } else if (isWordLike && !isWhitespace) {
          // 仅保留句子的第一个词 (索引 0)，隐藏后续所有词
          if (l2_wordsSincePunctuation >= 1) {
            shouldHideSegment = true;
          }
          l2_wordsSincePunctuation++;
        }
        break;

      case GameLevel.LEVEL_3:
        // 段首策略：
        if (isNewline) {
          // 遇到换行，标记下一词为行首
          l3_isStartOfLine = true;
        } else if (isWordLike && !isWhitespace) {
          if (l3_isStartOfLine) {
            // 如果是行首词，显示，并关闭行首标记
            l3_isStartOfLine = false; 
          } else {
            // 其他词全部隐藏
            shouldHideSegment = true;
          }
        }
        break;
        
      default:
        shouldHideSegment = false;
    }

    // --- Token 生成：将单词打散为字符 ---
    // 虽然逻辑是按“词”隐藏的，但为了 UI 渲染的网格效果，我们需要生成字符级的 Token。
    // 同一个词内的所有字符共享相同的隐藏状态。
    const chars = word.split('');
    chars.forEach((char) => {
      const charIsPunct = PUNCTUATION_REGEX.test(char);
      const charIsNewline = NEWLINE_REGEX.test(char);
      const charIsSpace = char === ' ';
      
      let charHidden = shouldHideSegment;

      // 强制规则：标点、换行、空格永远不隐藏，作为结构提示
      if (charIsPunct || charIsNewline || charIsSpace) {
        charHidden = false;
      }

      tokens.push({
        id: `t-${tokens.length}`, // 使用确定性ID (基于索引)，以便在切换等级时保留线索关联
        char: char,
        isHidden: charHidden,
        revealState: RevealState.HIDDEN, // 默认状态为占位符
        isPunctuation: charIsPunct,
        isNewline: charIsNewline
      });
    });
  }

  return tokens;
};

// --- 回退逻辑：基于单字符的处理 (兼容旧浏览器) ---
const processCharByChar = (text: string, level: GameLevel): Token[] => {
  const chars = text.split('');
  
  let l1_counter = 0;
  let l1_target = 2; // 固定步长
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
          }
        }
        break;

      case GameLevel.LEVEL_2:
        if (isNewline || isPunctuation) {
            l2_charsSincePunctuation = 0;
        } else if (char !== ' ') {
            if (l2_charsSincePunctuation >= 2) shouldHide = true; // 简单保留前2个字符
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
      id: `char-${index}`, // 使用确定性ID
      char,
      isHidden: shouldHide,
      revealState: RevealState.HIDDEN,
      isPunctuation,
      isNewline
    };
  });
};
