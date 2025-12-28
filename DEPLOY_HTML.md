# Deploying a React App as a Single HTML File

These steps convert a Vite React app into a single `index.html` file that works offline and can be opened directly via `file://` in a browser.

## Steps

1. Install the singlefile plugin:

```bash
npm install vite-plugin-singlefile --save-dev
```

2. Update `vite.config.js`:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  plugins: [react(), viteSingleFile()],
})
```

3. Build:

```bash
npm run build
```

4. Open `dist/index.html` directly in your browser.

## Why This Works

- Normal Vite builds use ES modules (`type="module"`), which browsers block on `file://` due to CORS
- `vite-plugin-singlefile` inlines all JS and CSS directly into the HTML, avoiding external file requests
- The result is a self-contained HTML file that works anywhere
