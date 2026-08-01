import { ipcMain, BrowserWindow, dialog } from 'electron'
import { writeFile } from '../lib/fileSystem'
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

export function registerExportIpcHandlers(): void {
  ipcMain.handle(
    'invoke:export-html',
    async (_event, html: string, defaultName: string): Promise<string | null> => {
      const outPath = await saveAsDialog(defaultName, ['html'], 'HTML')
      if (!outPath) return null
      const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN"><head>
<meta charset="UTF-8"><title>${path.basename(outPath, '.html')}</title>
<style>
body { font-family: system-ui, "Segoe UI", "Microsoft YaHei", sans-serif; max-width: 900px; margin: 40px auto; padding: 0 20px; line-height: 1.7; }
code { background: #f6f8fa; padding: 2px 6px; border-radius: 3px; }
pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow-x: auto; }
blockquote { border-left: 4px solid #dfe2e5; padding-left: 16px; color: #6a737d; margin-left: 0; }
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid #dfe2e5; padding: 8px 12px; }
th { background: #f6f8fa; }
img { max-width: 100%; }
</style>
</head><body>${html}</body></html>`
      try {
        await writeFile(outPath, fullHtml)
        logger.info('html exported:', outPath)
        return outPath
      } catch (e) {
        logger.error('export-html failed', e)
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
        const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN"><head>
<meta charset="UTF-8"><title>${path.basename(outPath, '.pdf')}</title>
<style>
  body { font-family: system-ui, "Segoe UI", "Microsoft YaHei", sans-serif; margin: 0; padding: 40px; line-height: 1.7; color: #1a1a1a; }
  code { background: #f6f8fa; padding: 2px 6px; border-radius: 3px; }
  pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow-x: auto; white-space: pre-wrap; }
  blockquote { border-left: 4px solid #dfe2e5; padding-left: 16px; color: #6a737d; margin-left: 0; }
  table { border-collapse: collapse; width: 100%; page-break-inside: auto; }
  tr { page-break-inside: avoid; page-break-after: auto; }
  th, td { border: 1px solid #dfe2e5; padding: 8px 12px; }
  th { background: #f6f8fa; }
  img { max-width: 100%; page-break-inside: avoid; }
  h1, h2, h3, h4, h5, h6 { page-break-after: avoid; }
  @media print { pre, code { white-space: pre-wrap !important; word-wrap: break-word; } }
</style>
</head><body>${html}</body></html>`
        await pdfWindow.loadURL(
          `data:text/html;charset=UTF-8,${encodeURIComponent(fullHtml)}`
        )
        const buf = await pdfWindow.webContents.printToPDF({
          pageSize: 'A4',
          margins: { marginType: 0 as unknown as undefined },
          printBackground: true,
          pageRanges: ''
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
