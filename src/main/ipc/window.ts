import { ipcMain, nativeTheme, shell, app } from 'electron'
import logger from '../lib/logger'

export function registerWindowIpcHandlers(): void {
  ipcMain.handle(
    'invoke:window-show-item-in-folder',
    async (_event, filePath: string): Promise<void> => {
      try {
        shell.showItemInFolder(filePath)
      } catch (e) {
        logger.error('showItemInFolder failed', e)
      }
    }
  )

  ipcMain.handle(
    'invoke:window-get-native-theme',
    async (): Promise<'light' | 'dark' | 'auto'> => {
      if (nativeTheme.themeSource === 'system') return 'auto'
      return nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
    }
  )

  void app.name
}
