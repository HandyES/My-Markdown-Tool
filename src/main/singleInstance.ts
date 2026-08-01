import { app, BrowserWindow } from 'electron'
import logger from './lib/logger'

export function setupSingleInstance(
  onFileFromSecondInstance: (filePath: string) => void
): void {
  const lock = app.requestSingleInstanceLock()
  if (!lock) {
    logger.warn('Single instance lock not acquired, quitting second instance')
    app.quit()
    return
  }

  // 主实例：收到第二实例的文件参数
  app.on('second-instance', (_event, commandLine) => {
    logger.info('Second instance detected, args:', commandLine)
    // Windows: commandLine 最后一个参数通常是文件路径
    const fileArg = commandLine.slice().reverse().find((a) => {
      if (!a || a.startsWith('-')) return false
      const low = a.toLowerCase()
      return low.endsWith('.md') || low.endsWith('.markdown')
    })
    if (fileArg) {
      onFileFromSecondInstance(fileArg)
    }

    // 把主窗口提上来
    const win = BrowserWindow.getAllWindows()[0]
    if (win) {
      if (win.isMinimized()) win.restore()
      win.show()
      win.focus()
    }
  })
}
