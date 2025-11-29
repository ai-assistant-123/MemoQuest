# MemoQuest - 智能记忆辅助系统需求规格说明书

## 1. 项目简介
MemoQuest 是一款基于脑科学“三级输出”记忆理论开发的 Web 应用程序。它通过将文本背诵过程转化为游戏化的闯关体验，利用“提取练习 (Retrieval Practice)”效应帮助用户高效记忆长篇文章。

本项目利用 React 19 构建，集成 Google Gemini API 提供智能视觉辅助，旨在解决传统背诵枯燥、效率低的问题。

## 2. 核心功能需求 (Functional Requirements)

### 2.1 文本输入与预处理 (Input & Pre-processing)
**功能模块**: `components/InputStage.tsx`, `services/textProcessor.ts`

*   **多源文本输入**:
    *   提供大尺寸文本域，支持用户手动输入或粘贴文本。
    *   **剪贴板集成**: 利用 `navigator.clipboard.readText()` API 读取系统剪贴板内容（需 `clipboard-read` 权限），并在 UI 上提供快捷粘贴按钮。
    *   **示例加载**: 提供一键加载预置示例文本（关于可行性分析的文章）的功能，方便用户快速上手体验。
*   **智能分词引擎**:
    *   **主要策略**: 优先检测并使用浏览器原生 `Intl.Segmenter` (Locale: `zh-CN`, Granularity: `word`) 对中文进行语义级分词，确保词语完整性（如“可行性”不会被拆分为“可”、“行”、“性”）。
    *   **降级策略**: 若环境不支持 Intl API，自动回退到单字符处理模式，保证基本可用性。
*   **字号控制**:
    *   提供 7 级字号调节 (`text-sm` 至 `text-4xl`)，状态在应用生命周期内全局保持。

### 2.2 记忆难度分级算法 (Game Levels Logic)
**功能模块**: `services/textProcessor.ts`

系统需支持三种渐进式难度，核心算法逻辑如下：

*   **Level 1: 间隔隐藏 (Interleave)**
    *   **目标**: 保留约 50% 的视觉线索，建立骨架。
    *   **逻辑**: 遍历分词结果，跳过标点、换行和空白符。对有效的“实词”进行布尔值翻转 (`true`/`false` 交替)，实现“显一词、隐一词”的效果。
*   **Level 2: 句末隐藏 (End-of-Sentence)**
    *   **目标**: 训练句子内部的逻辑联想。
    *   **逻辑**: 维护一个词序计数器。
        *   遇到标点符号 (`/[，。！？；：,.!?;:]/`) 或换行符 (`/\n/`) 时，计数器重置为 0。
        *   若计数器为 0（句首词），保持显示。
        *   若计数器 > 0（句中其余词），强制隐藏。
*   **Level 3: 段首保留 (Paragraph Start)**
    *   **目标**: 极限回忆挑战。
    *   **逻辑**: 维护“行首标记”状态。
        *   仅在遇到换行符 (`/\n/`) 后，将标记设为 `true`。
        *   对于实词，若标记为 `true`，则显示该词并将标记设为 `false`。
        *   其余所有词汇（包括标点后的词）均隐藏。

### 2.3 交互式揭示系统 (Interactive Reveal System)
**功能模块**: `components/GameStage.tsx`

隐藏区域（Token）作为可交互组件，遵循以下**状态机 (State Machine)** 循环：

1.  **初始状态 (HIDDEN_X)**:
    *   **表现**: 显示 `X` 字符。
    *   **约束**: `X` 的数量严格等于被隐藏的原始字符数量，为用户提供长度暗示。
2.  **线索状态 (HIDDEN_ICON)**:
    *   **前置条件**: 仅当用户触发 AI 生成线索，且该词组存在对应的 Emoji 时进入此状态。
    *   **表现**: 显示一个代表语义的 Emoji 图标。
    *   **目的**: 利用双重编码 (Dual Coding) 原理辅助记忆。
3.  **明文状态 (REVEALED)**:
    *   **表现**: 以高亮颜色显示原始文本。
4.  **循环逻辑**: 点击明文状态的词组，将重置回 `HIDDEN_X`。

### 2.4 AI 视觉辅助 (AI Integration)
**功能模块**: `components/GameStage.tsx`

*   **模型调用**: 集成 `@google/genai` SDK，使用 `gemini-2.5-flash` 模型。
*   **触发流程**:
    1.  提取当前视图中所有处于隐藏状态的连续文本块。
    2.  构造 Prompt，要求 AI 将这些文本块转换为含义最接近的 Emoji。
    3.  强制 AI 返回 JSON 格式数据 `{ [index: string]: string }`。
    4.  前端解析响应，将 Emoji 映射回对应的 Token ID。
*   **UI 反馈**: 生成过程中按钮显示 Loading 动画，生成后变为“魔法棒”激活状态。

### 2.5 界面与体验规范 (UI/UX Specifications)
*   **视觉风格**:
    *   采用深色模式 (Dark Mode)，主色调为 `#111827` (Gray-900)。
    *   字体采用 `Roboto Mono` (正文) 和 `Press Start 2P` (标题/装饰)，营造复古极客氛围。
*   **动画交互**:
    *   **进入动画**: 页面加载时的淡入 (`fade-in`) 和上滑 (`slide-up`)。
    *   **重置反馈**: 点击重置按钮时，内容区域触发缩放与模糊特效 (`animate-reset`)。
*   **响应式布局**:
    *   移动端自适应：工具栏自动折叠，字体大小自适应。
    *   自定义滚动条样式，适配暗色主题。

## 3. 技术栈 (Tech Stack)

*   **Core Framework**: React 19
*   **Language**: TypeScript
*   **Build Tool**: Vite
*   **Styling**: Tailwind CSS (CDN runtime for portability)
*   **Icons**: Lucide React
*   **AI SDK**: Google GenAI SDK (`@google/genai`)

## 4. 文件结构 (File Structure)

```bash
/
├── index.html              # 入口文件 (含 Tailwind CDN, Fonts, ImportMap)
├── index.tsx               # React 应用挂载点
├── types.ts                # TypeScript 类型定义 (Token, GameLevel, RevealState)
├── metadata.json           # 应用元数据与权限配置
├── services/
│   └── textProcessor.ts    # 核心逻辑：Intl 分词与 3 级隐藏算法实现
└── components/
    ├── App.tsx             # 根组件：管理视图切换与全局状态
    ├── InputStage.tsx      # 输入视图：文本编辑与设置
    ├── GameStage.tsx       # 游戏视图：核心交互、渲染与 AI 调用
    ├── Button.tsx          # 通用 UI：复古风格按钮
    ├── FontSizeControl.tsx # 通用 UI：字号控制器
    └── HelpModal.tsx       # 通用 UI：帮助文档弹窗
```