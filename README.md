# MemoQuest - 智能记忆辅助系统需求规格说明书

## 1. 项目概述
MemoQuest 是一款基于认知心理学“提取练习 (Retrieval Practice)”效应设计的 Web 应用程序。它将枯燥的文本背诵过程转化为游戏化的闯关体验，通过渐进式减少视觉线索（三级输出法），结合 AI 视觉联想与高拟真语音合成，帮助用户高效记忆长篇文章。

本项目使用 React 19 构建，采用 ES Modules 原生模块加载，集成 Google Gemini API (v1.30.0) 及兼容 OpenAI 协议的第三方模型。

---

## 2. 详细功能需求 (Functional Requirements)

### 2.1 文本输入与预处理 (Input Stage)
**对应模块**: `components/InputStage.tsx`, `services/textProcessor.ts`

1.  **文本获取**:
    *   **编辑与粘贴**: 支持多行文本输入，提供剪贴板读取按钮 (`navigator.clipboard.readText`)。
    *   **自动演示 (Auto Demo)**: 一键填入示例文本，触发全局演示模式。
    *   **工具栏**: 包含粘贴、清空、设置、帮助入口。

2.  **智能分词 (Segmentation)**:
    *   **策略**: 优先使用浏览器原生 `Intl.Segmenter` (zh-CN, word粒度) 进行语义分词。
    *   **降级**: 若不支持 Intl API，自动降级为单字符处理模式。
    *   **Token化**: 生成包含唯一 ID、字符内容、是否标点/换行/空格等属性的 `Token` 对象。

3.  **全局状态**:
    *   **字号**: 7 级调节 (`text-sm` ~ `text-4xl`)，跨页面持久化。
    *   **设置**: 通过 `SettingsModal` 配置 AI 模型参数与 TTS 偏好。

---

### 2.2 记忆难度分级算法 (Difficulty Levels)
**对应模块**: `services/textProcessor.ts`

核心算法根据 `GameLevel` 枚举决定 Token 的 `isHidden` 属性：

*   **Level 1: 间隔隐藏 (Interleave)**
    *   **逻辑**: 针对非标点、非换行、非空白的“实词”，执行严格的 `Boolean` 交替翻转 (Hide/Show)。
    *   **目标**: 保留约 50% 骨架，建立初步脉络。

*   **Level 2: 句末隐藏 (Hide After Punctuation)**
    *   **逻辑**: 维护句内词序计数器。遇标点/换行重置。仅保留句首第 1 个词 (Index 0)，其余隐藏。
    *   **目标**: 强化句子内部逻辑链。

*   **Level 3: 段首保留 (Paragraph Start Only)**
    *   **逻辑**: 维护行首标记。仅在换行符后重置为 `true`。仅显示段落第一个实词，其余全隐。
    *   **目标**: 极限回忆，仅依赖段落入口线索。

---

### 2.3 游戏核心交互 (Game Loop)
**对应模块**: `components/GameStage.tsx`

1.  **Token 状态机**:
    *   **HIDDEN (初始)**: 显示为下划线占位符 (`_`) 或 `X`，占位宽度自适应。
    *   **HIDDEN_ICON (线索)**: 若已生成 AI 线索，显示对应的 Emoji 图标。
    *   **REVEALED (明文)**: 点击后显示高亮原文 (`text-yellow-400`)。
    *   **交互**: 点击隐藏组可循环切换状态；支持成组揭示 (同一个词的字符作为一个组)。

2.  **辅助工具**:
    *   **Peek (偷看)**: 全局显示完整原文 (`text-emerald-300`)。
    *   **Reset (重置)**: 恢复当前关卡所有 Token 为隐藏状态，伴随缩放动画。
    *   **Navigation**: 关卡切换与返回首页。

---

### 2.4 AI 服务集成 (AI Services)

#### 2.4.1 视觉线索 (Visual Clues)
**对应模块**: `components/GameStage.tsx`
*   **功能**: 扫描当前隐藏的词组，调用 LLM 生成对应的 Emoji。
*   **Provider**:
    *   **Google Gemini**: 使用 `@google/genai` SDK，通过 `responseSchema` 强制输出 JSON 格式。
    *   **OpenAI Compatible**: 使用 `fetch` 调用 `/chat/completions`，请求 JSON Object。

#### 2.4.2 语音合成服务 (TTS Service)
**对应模块**: `services/ttsService.ts`
采用单例模式 (`TTSService.instance`) 管理音频上下文与播放队列。

*   **架构特性**:
    *   **AudioContext**: 用于处理 Gemini 返回的原始 PCM 音频流 (24kHz)。
    *   **Caching**: 内存缓存音频 Buffer/Blob，避免重复请求消耗 Token。
    *   **Preloading**: 播放当前段落时自动预加载下一段。
    *   **Session Management**: 使用 `sessionId` 解决异步请求竞态问题，确保“停止”操作立即生效。

*   **支持引擎**:
    1.  **Browser**: 原生 `SpeechSynthesis`，支持 Safari/Chrome 兼容性处理。
    2.  **Google**: 调用 `gemini-2.5-flash-preview-tts`，返回 Base64 PCM 数据。
    3.  **OpenAI**: 调用 `tts-1` API，返回 MP3 Blob。

---

### 2.5 界面与用户体验 (UI/UX)
*   **自适应布局**:
    *   **Desktop**: 顶部工具栏 (支持横向滚动)，中央内容区。
    *   **Mobile**: 紧凑型顶部栏 + 底部弹出式菜单 (Grid 布局)，优化触控体验。
*   **动画效果**:
    *   页面转场 (`animate-fade-in`, `animate-slide-up`)。
    *   重置时的视觉反馈 (`animate-reset`)。
*   **自动演示 (DemoOverlay)**:
    *   覆盖层高亮目标元素 (`animate-pulse`)。
    *   底部字幕 + 语音讲解同步执行。

---

## 3. 技术栈 (Tech Stack)

*   **Framework**: React 19.2.0 (via `importmap`)
*   **Language**: TypeScript
*   **Styling**: Tailwind CSS (CDN) + Lucide React Icons
*   **SDKs**: `@google/genai` (v1.30.0)
*   **Build**: ESM Native (No bundler required for runtime, suitable for AI Studio)

## 4. 文件结构

```bash
/
├── index.html              # 入口 HTML (含 importmap, Tailwind CDN)
├── index.tsx               # React 挂载点
├── App.tsx                 # 根组件 (路由状态管理)
├── types.ts                # 类型定义 (Token, GameLevel, RevealState, Settings)
├── metadata.json           # 应用元数据
├── components/
│   ├── InputStage.tsx      # 输入页 (文本输入, 粘贴, 工具栏)
│   ├── GameStage.tsx       # 游戏页 (主视图, Token渲染, 移动端菜单)
│   ├── Button.tsx          # 通用按钮组件
│   ├── FontSizeControl.tsx # 字号控制器
│   ├── HelpModal.tsx       # 帮助弹窗
│   ├── SettingsModal.tsx   # 设置弹窗 (API Key, Model, TTS配置)
│   └── DemoOverlay.tsx     # 演示模式覆盖层
└── services/
    ├── textProcessor.ts    # 文本处理核心 (Intl 分词, 隐藏算法)
    └── ttsService.ts       # 语音服务单例 (音频流处理, 缓存, 多引擎适配)
```

---

## 5. Vibe Code Prompt

以下提示词汇总了本项目所有核心逻辑与设计要求，可直接用于 AI 辅助编程工具（如 Bolt.new, Gemini Advanced, ChatGPT 等）以复现或迭代本项目。

```markdown
Role: Senior Frontend Engineer
Task: Build "MemoQuest", a game-based memory aid application.

Tech Stack:
- React 19 (ESM based, no bundler config needed)
- Tailwind CSS (via CDN)
- Lucide React Icons
- Google GenAI SDK (@google/genai v1.30.0)

Core Concept:
Implement a "Retrieval Practice" tool using a 3-stage output method to help users memorize long texts.

Detailed Requirements:

1. Text Processing Logic (services/textProcessor.ts):
   - Use `Intl.Segmenter` (zh-CN) for word-level segmentation. Fallback to char-by-char if unavailable.
   - Implement `processText(text, level)` returning a `Token[]`.
   - Level 1 (Interleave): Hide every other word (alternating boolean).
   - Level 2 (Hide after punctuation): Only show the first word of a sentence. Reset count on punctuation/newlines.
   - Level 3 (Paragraph Start): Only show the very first word of a line. Hide everything else.
   - Punctuation/Newlines/Spaces must NEVER be hidden.

2. Game Stage UI (components/GameStage.tsx):
   - Render text as interactive tokens.
   - Hidden tokens show as underscores (`_`). Click to reveal.
   - Support "Visual Clues": Use AI to turn hidden text into Emojis (State: Hidden -> Icon -> Revealed).
   - Responsive Design:
     - Desktop: Horizontal scrolling toolbar at the top.
     - Mobile: Sticky top header + Bottom sheet menu (Grid layout) for tools.
   - Tools needed: Font size toggle (7 levels), Peek (show original), Reset (animate re-hide), AI Clues button, TTS controls.

3. AI Integration (Google GenAI):
   - Visual Clues: Use `gemini-2.5-flash` with `responseSchema` (Type.OBJECT/ARRAY) to convert a list of Chinese words into an array of single Emojis.
   - TTS Service (services/ttsService.ts):
     - Singleton pattern.
     - Support 3 Providers: Browser Native, Google (Gemini), OpenAI.
     - Google TTS: Use `gemini-2.5-flash-preview-tts`. Handle raw PCM audio response. Decode using AudioContext (24kHz).
     - OpenAI TTS: Standard `audio/speech` endpoint.
     - Features: Preloading next sentence, Caching (Map<string, AudioBuffer>), Playback Rate control (0.5x - 2.0x).

4. Application Flow (App.tsx):
   - Input Stage: Textarea, Paste button (clipboard API), "Start Demo" button.
   - Demo Mode: Scripted sequence overlaying the UI, highlighting buttons, showing subtitles, and playing TTS explanation.
   - Settings: Modal to configure API Keys (Google/OpenAI), Model IDs, Theme (Light/Dark persistence), and TTS Voice selection.
   - Key Management: Support `window.aistudio.openSelectKey()` for Google environment.

5. Visual Style:
   - Font: 'Roboto Mono' for text, 'Press Start 2P' for headers.
   - Theme: "Paper" color (beige) for Light mode, Deep Gray for Dark mode.
   - Animations: `animate-fade-in`, `animate-slide-up`, `animate-reset` (scale/blur effect).
```