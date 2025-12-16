# AGENTS.md - MemoQuest Developer Guide

## Project Overview
MemoQuest is a gamified memory training Progressive Web App (PWA) designed around cognitive science principles like **Retrieval Practice** and **Dual Coding**. It helps users memorize long texts by transforming them into interactive "cloze" tests with progressive difficulty levels.

- **Core Tech Stack**: React 19, TypeScript, Tailwind CSS, Google GenAI SDK.
- **Architecture**: Client-side only (SPA), Zero-build (ES Modules via Importmap).
- **Key Features**:
  - **3-Stage Hiding Algorithm**: Uses `Intl.Segmenter` for smart text masking.
  - **AI Visual Clues**: Converts text to Emojis using `gemini-2.5-flash` or offline fallbacks.
  - **Multimodal TTS**: Supports Browser Native, Google Gemini, and MiniMax speech synthesis.
  - **PWA**: Offline-capable via Service Worker and Manifest.

## Code Style Guidelines
- **Framework & State**:
  - Use React 19 Functional Components with Hooks.
  - Manage state locally or via Context/Props lifting (avoid external state libraries unless necessary).
- **Styling**:
  - Use **Tailwind CSS** exclusively.
  - Implement Dark Mode using `dark:` variants for all UI components.
  - Use `lucide-react` for icons.
- **TypeScript**:
  - Enforce strict typing. Define interfaces in `types.ts`.
  - Avoid `any`.
- **GenAI Integration**:
  - Use `@google/genai` (v1.30.0+).
  - Initialize clients with `new GoogleGenAI({ apiKey: process.env.API_KEY })`.
  - Do NOT use the deprecated `GoogleGenerativeAI` class.
- **File Structure**:
  - `components/`: PascalCase (e.g., `GameStage.tsx`).
  - `services/`: camelCase (e.g., `ttsService.ts`).
  - `types.ts`: Shared definitions.
- **Performance**:
  - Use `React.memo` for granular text tokens to prevent lag on large texts.

## Security Considerations
- **API Key Management**:
  - **Never hardcode API keys**. Access the system-provided key via `process.env.API_KEY`.
  - For user-provided keys (e.g., custom endpoints), store them in component state or `localStorage` only, and ensure input fields use `type="password"`.
- **Data Privacy**:
  - MemoQuest is a client-side app. User text data resides in the browser (memory/localStorage).
  - When using AI features, data is sent to the respective provider (Google/MiniMax/Custom). Ensure the UI communicates this clearly.
- **Input Sanitization**:
  - React handles most XSS prevention automatically. Avoid `dangerouslySetInnerHTML`.

## Dev Environment Tips
- **No Build Step**: This project runs directly in the browser using ES Modules. Do not run `npm install` or `npm run build`.
- **Dependencies**: Manage external libraries in `index.html` via the `<script type="importmap">` tag. Use CDNs like `aistudiocdn.com` or `esm.sh`.
- **Running**: Use a static server (e.g., VS Code "Live Server" extension, `python3 -m http.server`, or `npx serve .`) to serve the root directory.

## Testing Instructions
- **Manual Verification**: There is no automated test suite. Verify all changes manually in the browser.
- **Smoke Test Checklist**:
  1. **Game Flow**: Paste text -> Start -> Toggle Levels (1/2/3) -> Reveal Tokens.
  2. **AI Features**: Click "AI Clues" to test `@google/genai` integration (check for Emojis).
  3. **Audio**: Test TTS Play/Pause/Loop/Rate control.
  4. **PWA**: Verify `sw.js` registration and offline caching in DevTools > Application.
  5. **Responsive**: Check Mobile (bottom menu) vs Desktop (top toolbar) layouts.

## PR Instructions
- **Title format**: [MemoQuest] <Title>
- **Code Style**:
  - Use **Tailwind CSS** for all styling; support `dark:` mode.
  - Use `React.memo` for performance-critical components.
- **Architecture Constraints**:
  - Do not import local files without extensions (unless implicitly handled).
  - If adding new assets, update `ASSETS_TO_CACHE` in `sw.js`.