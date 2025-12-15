# AGENTS.md - MemoQuest Developer Guide

## Dev environment tips
- **No Build Step**: This project runs directly in the browser using ES Modules. Do not run `npm install` or `npm run build`.
- **Dependencies**: Manage external libraries in `index.html` via the `<script type="importmap">` tag. Use CDNs like `aistudiocdn.com` or `esm.sh`.
- **Running**: Use a static server (e.g., VS Code "Live Server" extension, `python3 -m http.server`, or `npx serve .`) to serve the root directory.
- **File Structure**:
  - `components/`: UI elements (React Functional Components).
  - `services/`: Core logic (e.g., `textProcessor.ts`, `ttsService.ts`).
  - `types.ts`: Shared TypeScript interfaces.

## Testing instructions
- **Manual Verification**: There is no automated test suite. Verify all changes manually in the browser.
- **Smoke Test Checklist**:
  1. **Game Flow**: Paste text -> Start -> Toggle Levels (1/2/3) -> Reveal Tokens.
  2. **AI Features**: Click "AI Clues" to test `@google/genai` integration (check for Emojis).
  3. **Audio**: Test TTS Play/Pause/Loop/Rate control.
  4. **PWA**: Verify `sw.js` registration and offline caching in DevTools > Application.
  5. **Responsive**: Check Mobile (bottom menu) vs Desktop (top toolbar) layouts.
- **Linting**: Ensure code is valid TypeScript. Fix any type errors before finishing.

## PR instructions
- **Title format**: [MemoQuest] <Title>
- **Code Style**:
  - Use **Tailwind CSS** for all styling; support `dark:` mode.
  - Use `React.memo` for performance-critical components (e.g., text tokens).
- **Architecture Constraints**:
  - Do not import local files without extensions (use `.ts` or `.tsx` imports implicitly handled by the server/browser setup or just keep them in the same module graph).
  - If adding new assets, update `ASSETS_TO_CACHE` in `sw.js`.
- **Safety**: Use `process.env.API_KEY` for Google GenAI. Do not hardcode keys.
