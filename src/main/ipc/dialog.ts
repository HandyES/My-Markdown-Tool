import { ipcMain, dialog, BrowserWindow } from 'electron'
import { readFile, writeFile } from '../lib/fileSystem'
import logger from '../lib/logger'

function getMainWindow(): BrowserWindow | undefined {
  return BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0] || undefined
}

const OPEN_DIALOG_OPTS: Electron.OpenDialogOptions = {
  title: '打开 Markdown 文件',
  filters: [
    { name: 'Markdown', extensions: ['md', 'markdown', 'txt'] },
    { name: '所有文件', extensions: ['*'] }
  ],
  properties: ['openFile', 'showHiddenFiles']
}

export function registerDialogIpcHandlers(): void {
  ipcMain.handle(
    'invoke:file-open',
    async (): Promise<{ path: string; content: string } | null> => {
      const win = getMainWindow()
      const result = win
        ? await dialog.showOpenDialog(win, OPEN_DIALOG_OPTS)
        : await dialog.showOpenDialog(OPEN_DIALOG_OPTS)
      if (result.canceled || result.filePaths.length === 0) return null
      const filePath = result.filePaths[0]
      try {
        const content = await readFile(filePath)
        logger.info('file opened via dialog:', filePath)
        return { path: filePath, content }
      } catch (e) {
        logger.error('open file dialog read failed', e)
        dialog.showErrorBox('打开文件失败', String(e))
        return null
      }
    }
  )

  ipcMain.handle(
    'invoke:file-save-as',
    async (
      _event,
      content: string,
      defaultName = 'Untitled.md'
    ): Promise<string | null> => {
      const win = getMainWindow()
      const saveOpts = {
        title: '另存为',
        defaultPath: defaultName,
        filters: [
          { name: 'Markdown', extensions: ['md', 'markdown'] },
          { name: '所有文件', extensions: ['*'] }
        ]
      }
      const result = win
        ? await dialog.showSaveDialog(win, saveOpts)
        : await dialog.showSaveDialog(saveOpts)
      if (result.canceled || !result.filePath) return null
      try {
        await writeFile(result.filePath, content)
        logger.info('file-save-as saved:', result.filePath)
        return result.filePath
      } catch (e) {
        logger.error('save as failed', e)
        dialog.showErrorBox('保存文件失败', String(e))
        return null
      }
    }
  )
}
