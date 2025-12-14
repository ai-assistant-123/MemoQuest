# MemoQuest - 记忆探索 🧠✨

[🌐 在线演示 / Live Demo](https://memo.ai-assistant-123.com)

## 1. 项目概述 (Overview)

**MemoQuest** 是一款基于认知神经科学设计的沉浸式记忆辅助工具。它摒弃了传统的“死记硬背”模式，利用**提取练习 (Retrieval Practice)** 和 **多重编码 (Dual Coding)** 理论，将枯燥的文本背诵转化为即时反馈的闯关游戏。

通过三级渐进式难度（Three-Stage Output），结合 AI 生成的视觉线索与高拟真语音合成，帮助用户在“输入-预测-生成”的循环中构建长期记忆。

本项目在 google aistudio 中完成。

---

## 2. 核心功能 (Key Features)

### 🧠 科学记忆引擎 (The Science)
基于 Bjork 的“必要难度”理论，设计了三个渐进关卡：
1.  **Level 1: 间隔隐藏 (Interleave)** - *认知脚手架*
    *   利用 `Intl.Segmenter` 对中文进行语义分词。
    *   间隔保留约 50% 的实词，利用“完形填空效应”降低初始负荷。
2.  **Level 2: 预测编码 (Prediction)** - *逻辑链强化*
    *   仅显示每个句子的**第一个词**。
    *   强迫大脑根据句首线索预测后续内容，强化神经突触连接。
3.  **Level 3: 生成效应 (Generation)** - *深度提取*
    *   仅显示**段落首词**。
    *   实现极少线索下的全量输出，记忆留存率最高。

### 🎨 双重编码 AI 线索 (AI Visual Clues)
当记忆卡顿对应文字时，AI 将文字转化为 Emoji 图标，建立视觉锚点：
*   **在线模式**:
    *   **Google Gemini**: 调用 `gemini-2.5-flash` 模型，精准理解语境并生成 JSON 格式的 Emoji 映射。
    *   **Custom (OpenAI Compatible)**: 支持 DeepSeek, Moonshot 等兼容 OpenAI 接口的模型。
*   **离线模式 (Offline Fallback)**:
    *   内置高频词汇映射表 (300+ 关键词)。
    *   确定性哈希算法：为未命中的词汇生成固定的抽象符号，确保无网络环境下体验不降级。

### 🗣️ 多模态语音合成 (TTS Engine)
支持多种语音引擎，满足不同场景需求：
*   **Browser Native**: 零成本、低延迟，利用浏览器原生 `SpeechSynthesis` API。
*   **Google Gemini TTS**: 调用 `gemini-2.5-flash-preview-tts`，生成真人级自然语音 (支持 Puck, Kore 等音色)。
*   **MiniMax TTS**: 集成 MiniMax (speech-2.6-hd) 模型，提供极致拟真的语音体验 (如 female-shaonv)。
*   **高级特性**:
    *   支持 0.5x ~ 2.0x 倍速调节。
    *   智能预加载 (Preloading)：利用内存缓存和滑动窗口机制，实现无缝连读。
    *   循环播放 (Loop Mode)：针对难点段落反复磨耳朵。

### 📱 极致体验 (UX/UI)
*   **PWA 支持**: 支持离线访问，可安装为原生应用体验 (Manifest + Service Worker)。
*   **响应式设计**:
    *   **Desktop**: 横向滚动工具栏，大屏沉浸阅读。
    *   **Mobile**: 底部安全区适配，顶部下拉式功能菜单，触控优化。
*   **主题系统**: 自动/手动切换明亮 (Paper Beige) 与深色 (Slate Dark) 模式，护眼配色。
*   **自动演示**: 内置交互式教程 (`DemoOverlay`)，通过脚本自动操作 UI 进行功能讲解。

---

## 3. 技术架构 (Technical Architecture)

本项目是一个纯前端应用，利用现代浏览器的能力实现“零构建”开发。

*   **Core**: React 19, TypeScript, ReactDOM (Client).
*   **Module Loading**: Native ES Modules via `<script type="importmap">`.
*   **Styling**: Tailwind CSS (CDN runtime), Lucide React (Icons).
*   **AI SDK**: `@google/genai` (v1.30.0) for browser-based AI interaction.
*   **Storage**: `localStorage` for content/settings persistence, `CacheStorage` for PWA assets.
*   **Algorithms**:
    *   Text Processing: `Intl.Segmenter` (Polyfilled by logic if absent).
    *   Audio: Web Audio API (`AudioContext`) for decoding raw PCM data from Gemini.

---

## 4. 文件结构 (File Structure)

```bash
/
├── index.html              # 入口 (Importmap, Tailwind, Google Fonts)
├── index.tsx               # React 根挂载
├── App.tsx                 # 主应用逻辑 & 路由状态
├── types.ts                # 类型定义 (GameLevel, ModelSettings 等)
├── metadata.json           # 应用配置元数据
├── manifest.json           # PWA 安装清单
├── sw.js                   # Service Worker (离线缓存策略)
├── components/             # UI 组件库
│   ├── InputStage.tsx      # 输入/编辑页
│   ├── GameStage.tsx       # 核心游戏页 (Token渲染, 交互)
│   ├── SettingsModal.tsx   # 设置 (API Key, TTS, Theme)
│   ├── HelpModal.tsx       # 原理说明弹窗
│   ├── DemoOverlay.tsx     # 自动演示遮罩层
│   ├── IntroAnimation.tsx  # 开场动画组件
│   ├── FontSizeControl.tsx # 字号控制器
│   └── Button.tsx          # 通用按钮
└── services/               # 核心业务逻辑
    ├── textProcessor.ts    # 文本分词与隐藏算法
    ├── ttsService.ts       # 语音合成单例 (AudioContext, Caching)
    └── offlineEmojiService.ts # 离线 Emoji 映射与生成逻辑
```

---

## 5. 快速开始 (Getting Started)

由于采用原生 ESM，无需 `npm install` 或 `npm run build`。

1.  **克隆项目**:
    ```bash
    git clone https://github.com/your-repo/memoquest.git
    ```

2.  **启动服务**:
    你需要一个静态文件服务器（因为浏览器为了安全，不允许 `file://` 协议加载 ES Modules）。
    
    *   **VS Code**: 安装 "Live Server" 插件，右键 `index.html` -> "Open with Live Server".
    *   **Python**:
        ```bash
        python3 -m http.server 8000
        ```
    *   **Node**:
        ```bash
        npx serve .
        ```

3.  **配置 AI**:
    *   点击右上角设置图标。
    *   选择 **Model Provider**。
    *   填入 API Key。
    *   (可选) 配置 TTS 服务商 (Browser/Gemini/MiniMax)。

---

## 6. Prompt for Recreation (Vibe Coding)

如果你希望使用 AI 辅助编程工具复现或迭代此项目，可以使用以下 Prompt：

```markdown
Role: Senior Frontend Engineer
Task: Build "MemoQuest", a React 19 based progressive web app (PWA) for memory training.

Key Technical Requirements:
1.  **Stack**: React 19 (ESM/Importmap), Tailwind CSS (CDN), TypeScript. No bundler.
2.  **PWA**: Include manifest.json and sw.js for offline capabilities.
3.  **Core Logic (Text Processor)**: 
    -   Use `Intl.Segmenter` (zh-CN) to tokenize text.
    -   Implement 3 hiding levels: Interleave (50%), First-Word-Only (Sentence), First-Word-Only (Paragraph).
    -   Preserve punctuation/newlines.
4.  **AI Integration**:
    -   **Visual**: Use `@google/genai` to map hidden words to Emojis (JSON schema). Implement an Offline fallback using a keyword dictionary + hash mapping.
    -   **Audio (TTS)**: Singleton `TTSService`. Support Browser API, Gemini (PCM stream decoding via AudioContext), and MiniMax API. Implement preloading and caching logic.
5.  **UI/UX**: 
    -   **GameStage**: Render interactive tokens. Click to toggle state (Hidden -> Icon -> Text).
    -   **Responsive**: Mobile-first menu design; Desktop horizontal toolbar.
    -   **Theming**: System/Manual Dark mode toggle using Tailwind `dark:` classes.
    -   **Demo**: Scripted tour using an overlay to highlight DOM elements.
6.  **Style**: 'Roboto Mono' for text, 'Press Start 2P' for branding. Soft beige background for Day mode.
```

