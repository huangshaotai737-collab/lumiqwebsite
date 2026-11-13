<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 中文交付與上線文字

- 後臺介面的中文文案，以及交付文件、操作說明與核驗報告，預設使用繁體中文。
- 合併、重新部署與交付前，檢查登入、導航、表單、狀態、錯誤提示及素材用途說明是否混入簡體；頁面語言標記使用 `zh-Hant`。
- 保留使用者輸入的業務資料、引用原文、其他語言內容及程式識別值，不把它們當作介面文案批次轉換。
- 修正文字時保留最新功能、媒體校驗配置及協作者的修改，並在正式入口回讀驗證。
