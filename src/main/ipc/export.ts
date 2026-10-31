import { ipcMain, BrowserWindow, dialog, nativeTheme } from 'electron'
import { writeFile } from '../lib/fileSystem'
import { readConfig } from '../lib/config'
import logger from '../lib/logger'
import * as path from 'path'

function getMainWindow(): BrowserWindow | undefined {
  return BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0] || undefined
}

async function saveAsDialog(
  defaultName: string,
  extensions: string[],
  description: string
): Promise<string | null> {
  const win = getMainWindow()
  const opts = {
    title: `导出 ${description}`,
    defaultPath: defaultName,
    filters: [{ name: description, extensions }]
  }
  const result = win
    ? await dialog.showSaveDialog(win, opts)
    : await dialog.showSaveDialog(opts)
  if (result.canceled || !result.filePath) return null
  return result.filePath
}

/** 根据配置与系统主题判断当前是否为暗色 */
async function isDarkMode(): Promise<boolean> {
  try {
    const cfg = await readConfig()
    if (cfg.appearance.theme === 'dark') return true
    if (cfg.appearance.theme === 'light') return false
  } catch (e) {
    logger.warn('read theme config failed', e)
  }
  return nativeTheme.shouldUseDarkColors
}

/** 生成与当前主题一致的导出样式 */
function buildThemeCss(isDark: boolean): string {
  const vars = isDark
    ? {
        bg: '#1e1e1e',
        text: '#d4d4d4',
        secondary: '#888888',
        border: '#3c3c3c',
        codeBg: '#2d2d2d',
        accent: '#4daafc',
        quote: '#9a9a9a'
      }
    : {
        bg: '#ffffff',
        text: '#1a1a1a',
        secondary: '#666666',
        border: '#e0e0e0',
        codeBg: '#f8f8f8',
        accent: '#0066cc',
        quote: '#6a737d'
      }

  return `
  * { box-sizing: border-box; }
  html, body { background: ${vars.bg}; color: ${vars.text}; }
  body {
    font-family: system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif;
    max-width: 860px; margin: 0 auto; padding: 40px 24px; line-height: 1.75;
    font-size: 16px; word-wrap: break-word;
  }
  h1, h2, h3, h4, h5, h6 { color: ${vars.text}; margin: 1.4em 0 0.6em; line-height: 1.35; }
  h1 { border-bottom: 1px solid ${vars.border}; padding-bottom: 0.3em; }
  p { margin: 0.8em 0; }
  a { color: ${vars.accent}; }
  code {
    background: ${vars.codeBg}; color: ${vars.text}; padding: 2px 6px;
    border-radius: 3px; font-family: "Cascadia Code", Consolas, monospace;
  }
  pre {
    background: ${vars.codeBg}; border: 1px solid ${vars.border}; padding: 16px;
    border-radius: 6px; overflow-x: auto; white-space: pre-wrap; word-break: break-word;
  }
  pre code { background: transparent; padding: 0; }
  blockquote {
    border-left: 4px solid ${vars.accent}; padding-left: 16px;
    color: ${vars.quote}; margin-left: 0;
  }
  table { border-collapse: collapse; width: 100%; margin: 1em 0; }
  th, td { border: 1px solid ${vars.border}; padding: 8px 12px; text-align: left; }
  th { background: ${vars.codeBg}; }
  img { max-width: 100%; height: auto; }
  ul, ol { padding-left: 1.6em; }
  hr { border: none; border-top: 1px solid ${vars.border}; margin: 2em 0; }
  .vditor-copy { display: none; }
  `
}

const PRINT_CSS = `
  @page { size: A4; margin: 0; }
  @media print {
    body { padding: 16mm 14mm; margin: 0; max-width: none; }
    pre, code { white-space: pre-wrap !important; word-break: break-word; }
    pre, img, table { page-break-inside: avoid; }
    h1, h2, h3, h4, h5, h6 { page-break-after: avoid; }
    tr { page-break-inside: avoid; }
  }
`

function buildHtmlDocument(
  title: string,
  html: string,
  themeCss: string,
  printCss = ''
): string {
  return `<!DOCTYPE html>
<html lang="zh-CN"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>${themeCss}${printCss}</style>
</head><body>${html}</body></html>`
}

export function registerExportIpcHandlers(): void {
  ipcMain.handle(
    'invoke:export-html',
    async (_event, html: string, defaultName: string): Promise<string | null> => {
      const outPath = await saveAsDialog(defaultName, ['html'], 'HTML')
      if (!outPath) return null
      try {
        const dark = await isDarkMode()
        const doc = buildHtmlDocument(
          path.basename(outPath, '.html'),
          html,
          buildThemeCss(dark)
        )
        await writeFile(outPath, doc)
        logger.info('html exported:', outPath)
        return outPath
      } catch (e) {
        logger.error('export-html failed', e)
        dialog.showErrorBox('导出 HTML 失败', String(e))
        return null
      }
    }
  )

  ipcMain.handle(
    'invoke:export-pdf',
    async (_event, html: string, defaultName: string): Promise<string | null> => {
      const outPath = await saveAsDialog(defaultName, ['pdf'], 'PDF')
      if (!outPath) return null

      let pdfWindow: BrowserWindow | null = null
      try {
        const dark = await isDarkMode()
        const doc = buildHtmlDocument(
          path.basename(outPath, '.pdf'),
          html,
          buildThemeCss(dark),
          PRINT_CSS
        )
        pdfWindow = new BrowserWindow({
          show: false,
          width: 1200,
          height: 1600,
          webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true
          }
        })
        await pdfWindow.loadURL(
          `data:text/html;charset=UTF-8,${encodeURIComponent(doc)}`
        )
        const buf = await pdfWindow.webContents.printToPDF({
          pageSize: 'A4',
          printBackground: true,
          margins: { top: 0, bottom: 0, left: 0, right: 0 }
        })
        await writeFile(outPath, buf)
        logger.info('pdf exported:', outPath)
        return outPath
      } catch (e) {
        logger.error('export-pdf failed', e)
        dialog.showErrorBox('导出 PDF 失败', String(e))
        return null
      } finally {
        if (pdfWindow && !pdfWindow.isDestroyed()) {
          pdfWindow.destroy()
        }
      }
    }
  )

  ipcMain.handle(
    'invoke:export-md',
    async (_event, markdown: string, defaultName: string): Promise<string | null> => {
      const outPath = await saveAsDialog(defaultName, ['md', 'markdown'], 'Markdown')
      if (!outPath) return null
      try {
        await writeFile(outPath, markdown)
        logger.info('markdown exported:', outPath)
        return outPath
      } catch (e) {
        logger.error('export-md failed', e)
        return null
      }
    }
  )
}
