# MemoQuest - 智能记忆辅助系统需求规格说明书

## 1. 项目概述
MemoQuest 是一款基于认知心理学“提取练习 (Retrieval Practice)”效应设计的 Web 应用程序。它将枯燥的文本背诵过程转化为游戏化的闯关体验，通过渐进式减少视觉线索（三级输出法），帮助用户高效记忆长篇文章。

本项目使用 React 19 构建，集成 Google Gemini API 提供智能视觉辅助 (Visual Clues)。

---

## 2. 详细功能需求 (Functional Requirements)

### 2.1 文本输入与预处理阶段 (Input Stage)
**对应模块**: `components/InputStage.tsx`, `services/textProcessor.ts`

该阶段负责接收用户内容并进行清洗、分词和初始化配置。

1.  **文本获取**:
    *   **手动输入**: 支持大段文本的粘贴和编辑。
    *   **剪贴板集成**: 提供快捷按钮，调用 `navigator.clipboard.readText()` 读取系统剪贴板内容自动追加到输入框（需浏览器权限）。
    *   **示例加载**: 提供“加载示例”按钮，快速填入关于“可行性分析”的预置文本，用于演示功能。
    *   **清空功能**: 支持一键清空当前内容。

2.  **智能分词 (Segmentation)**:
    *   **策略优先级**:
        1.  优先使用浏览器原生 `Intl.Segmenter` (Locale: `zh-CN`, Granularity: `word`) 进行语义级分词。这确保了中文词汇（如“可行性”）被视为一个整体，而不是拆散的字符。
        2.  **降级处理**: 若环境不支持 Intl API，自动降级为基于单字符的处理模式。
    *   **Token 化**: 将文本转换为 `Token` 对象数组，每个 Token 包含字符本身、是否为标点、是否换行以及当前的揭示状态。

3.  **全局设置**:
    *   **字号控制**: 支持 7 级字号调节 (`text-sm` 到 `text-4xl`)，该设置在输入页和游戏页之间全局共享。

---

### 2.2 记忆难度分级算法 (Difficulty Levels)
**对应模块**: `services/textProcessor.ts`

系统核心算法，根据不同的 Level 决定哪些 Token 应该被“隐藏” (`isHidden: true`)。

*   **Level 1: 间隔隐藏 (Interleave)**
    *   **逻辑**: 建立文本骨架。
    *   **算法**: 遍历分词结果。跳过标点、换行和纯空格。对剩余的“实词”进行布尔值交替翻转 (Toggle)。
    *   **效果**: “显示一个词，隐藏一个词，显示一个词...”，保留约 50% 的视觉线索。

*   **Level 2: 句末隐藏 (Hide After Punctuation)**
    *   **逻辑**: 强化句子内部逻辑，仅保留线头。
    *   **算法**: 维护一个“词序计数器”。
        *   遇到标点符号 (`/[,。！？;:]/`) 或换行符时，计数器重置为 0。
        *   若计数器为 0（句首词），保持显示。
        *   若计数器 >= 1（句中其余词），强制隐藏。
    *   **效果**: 每句话只显示第一个词，其余全部隐藏，迫使通过句首词回忆整句。

*   **Level 3: 段首保留 (Paragraph Start Only)**
    *   **逻辑**: 极限回忆，仅保留段落入口。
    *   **算法**: 维护一个“行首标记 (isStartOfLine)”。
        *   仅在遇到换行符 (`\n`) 后，将标记设为 `true`。
        *   对于实词，若标记为 `true`，显示该词并将标记设为 `false`。
        *   其余所有词（即使是标点后的词）均隐藏。
    *   **效果**: 一大段文字仅显示第一个词，其余全隐。

---

### 2.3 游戏交互与状态机 (Game Loop & Interaction)
**对应模块**: `components/GameStage.tsx`

在游戏阶段，被标记为 `isHidden` 的 Token 会组成“隐藏组 (Hidden Group)”，遵循严格的状态流转机制。

#### 2.3.1 Token 状态机 (State Machine)
每个隐藏组通过点击循环切换以下状态：

1.  **HIDDEN_X (初始态)**
    *   **表现**: 显示为字符 `X`。
    *   **细节**: `X` 的数量与被隐藏的原始字符数量一致（1:1 映射），提供长度暗示。
2.  **HIDDEN_ICON (线索态)**
    *   **条件**: 仅当已生成 AI 线索 (Clues) 且该词有对应 Emoji 时进入此状态。若无 AI 线索，直接跳过此状态。
    *   **表现**: 显示一个代表该词义的 Emoji 图标。
    *   **原理**: 双重编码 (Dual Coding)，利用图像辅助记忆。
3.  **REVEALED (明文态)**
    *   **表现**: 高亮显示原始文本 (`text-yellow-400`)。
4.  **循环**: 点击明文态再次回到 HIDDEN_X。

#### 2.3.2 辅助功能
*   **重置 (Reset)**: 将所有 Token 状态强制恢复为 `HIDDEN_X`，并触发缩放模糊动画 (`animate-reset`)。
*   **查看原文 (Peek)**: 全局开关，以绿色字体显示完整原文，用于核对。

---

### 2.4 AI 视觉线索集成 (AI Integration)
**对应模块**: `components/GameStage.tsx` -> `generateVisualClues`

利用 LLM 为隐藏的文字生成视觉联想。

*   **模型**: Google Gemini (`gemini-2.5-flash`)。
*   **触发机制**: 用户点击“魔杖”按钮。
*   **处理流程**:
    1.  扫描当前视图，提取所有连续的隐藏文本块（Hidden Groups）。
    2.  构建 Prompt，请求 AI 将这些中文词汇转换为单个 Emoji。
    3.  **Schema 约束**: 使用 `responseSchema` 强制 AI 返回 JSON 格式 `{ items: string[] }` 或索引映射对象，确保解析稳定性。
    4.  **状态更新**: 将返回的 Emoji 映射到对应的 Token ID，存入 `clues` 状态字典。
*   **错误处理**: 若 JSON 解析失败或网络错误，回退显示通用图标。

---

### 2.5 界面与用户体验 (UI/UX)
*   **视觉风格**:
    *   **暗色主题**: 基于 `gray-900` / `gray-800`，减少视觉疲劳。
    *   **字体**: 正文使用 `Roboto Mono` 等宽字体对齐网格；标题使用 `Press Start 2P` 像素风字体。
*   **响应式设计**:
    *   移动端 (`< md`) 自动折叠工具栏布局。
    *   字号控制器在小屏下依然可见。
*   **动画**:
    *   页面切换时的淡入上滑 (`animate-fade-in`, `animate-slide-up`)。
    *   Token 状态切换的过渡效果。

---

## 3. 技术栈 (Tech Stack)

*   **框架**: React 19
*   **语言**: TypeScript
*   **构建工具**: Vite
*   **样式**: Tailwind CSS (CDN Runtime) + Lucide React Icons
*   **AI SDK**: `@google/genai`

## 4. 关键文件结构

```bash
/
├── services/
│   └── textProcessor.ts    # 核心算法：Intl 分词与三种隐藏策略的实现
├── components/
│   ├── InputStage.tsx      # 输入页：剪贴板处理、文本输入
│   ├── GameStage.tsx       # 游戏页：主逻辑、状态机、Gemini API 调用
│   ├── FontSizeControl.tsx # 公共组件：字号调节
│   └── HelpModal.tsx       # 帮助文档
├── types.ts                # 类型定义 (Token, GameLevel, RevealState)
└── index.tsx               # 入口
```
