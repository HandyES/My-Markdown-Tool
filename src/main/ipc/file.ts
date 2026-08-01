import { ipcMain } from 'electron'
import { readFile, writeFile, fileExists } from '../lib/fileSystem'
import logger from '../lib/logger'

export function registerFileIpcHandlers(): void {
  ipcMain.handle('invoke:file-new', async () => {
    logger.info('file-new invoked')
    return null
  })

  ipcMain.handle(
    'invoke:file-open-path',
    async (_event, filePath: string): Promise<{ path: string; content: string } | null> => {
      try {
        if (!(await fileExists(filePath))) {
          logger.warn('file not found:', filePath)
          return null
        }
        const content = await readFile(filePath)
        logger.info('file opened:', filePath)
        return { path: filePath, content }
      } catch (e) {
        logger.error('file-open-path failed', e)
        return null
      }
    }
  )

  ipcMain.handle(
    'invoke:file-save',
    async (_event, filePath: string, content: string): Promise<string | null> => {
      // 如果没有路径，返回 null，让渲染层走 saveAs
      if (!filePath) return null
      try {
        await writeFile(filePath, content)
        logger.info('file saved:', filePath)
        return filePath
      } catch (e) {
        logger.error('file-save failed', e)
        return null
      }
    }
  )
}
