import { BrowserWindow, app, shell } from 'electron'
import type { FileTab } from '@shared/types/file'
import logger from './logger'

const SESSION_FILE = 'session.json'

import { join } from 'path'
import { readFile, writeFile, fileExists } from './fileSystem'

interface SessionData {
  openFiles: string[]
  activeFilePath: string | null
  windowBounds?: {
    x: number
    y: number
    width: number
    height: number
  }
}

/**
 * 保存会话状态（打开的文件列表、窗口大小）
 */
export async function saveSession(
  tabs: FileTab[],
  activeTabId: string | null
): Promise<void> {
  const userData = app.getPath('userData')
  const sessionPath = join(userData, SESSION_FILE)

  const openFiles: string[] = tabs
    .filter((t) => t.path !== null)
    .map((t) => t.path as string)

  const activeTab = tabs.find((t) => t.id === activeTabId)
  const data: SessionData = {
    openFiles,
    activeFilePath: activeTab?.path ?? null
  }

  const win = BrowserWindow.getFocusedWindow()
  if (win && !win.isMaximized() && !win.isMinimized()) {
    const bounds = win.getBounds()
    data.windowBounds = bounds
  }

  try {
    await writeFile(sessionPath, JSON.stringify(data, null, 2))
    logger.debug('Session saved, files count:', openFiles.length)
  } catch (e) {
    logger.error('Save session failed', e)
  }
}

/**
 * 恢复会话状态，返回文件路径列表
 */
export async function restoreSession(): Promise<{
  openFiles: string[]
  activeFilePath: string | null
  windowBounds?: SessionData['windowBounds']
}> {
  const userData = app.getPath('userData')
  const sessionPath = join(userData, SESSION_FILE)

  const exists = await fileExists(sessionPath)
  if (!exists) {
    return { openFiles: [], activeFilePath: null }
  }

  try {
    const raw = await readFile(sessionPath)
    const parsed = JSON.parse(raw) as SessionData

    // 过滤掉不存在的文件
    const validFiles: string[] = []
    for (const p of parsed.openFiles) {
      if (await fileExists(p)) {
        validFiles.push(p)
      } else {
        logger.warn('Session file missing, skipping:', p)
      }
    }

    logger.info('Session restored, files:', validFiles.length)
    return {
      openFiles: validFiles,
      activeFilePath:
        parsed.activeFilePath && validFiles.includes(parsed.activeFilePath)
          ? parsed.activeFilePath
          : null,
      windowBounds: parsed.windowBounds
    }
  } catch (e) {
    logger.error('Restore session failed', e)
    return { openFiles: [], activeFilePath: null }
  }
}

/**
 * 在资源管理器中显示文件
 */
export function showItemInFolder(filePath: string): void {
  shell.showItemInFolder(filePath)
}
