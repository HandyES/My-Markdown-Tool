import { ipcMain } from 'electron'
import { readConfig, writeConfig } from '../lib/config'
import logger from '../lib/logger'
import type { AppConfig } from '@shared/types/config'

export function registerConfigIpcHandlers(): void {
  ipcMain.handle('invoke:config-get', async (): Promise<AppConfig> => {
    return readConfig()
  })

  ipcMain.handle(
    'invoke:config-set',
    async (_event, config: AppConfig): Promise<void> => {
      try {
        await writeConfig(config)
      } catch (e) {
        logger.error('config-set failed', e)
        throw e
      }
    }
  )
}
