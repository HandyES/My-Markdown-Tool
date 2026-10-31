import { app, shell, BrowserWindow, nativeTheme, ipcMain } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import logger from './lib/logger'
import { buildMenu } from './menu'
import { setupSingleInstance } from './singleInstance'
import { registerFileIpcHandlers } from './ipc/file'
import { registerDialogIpcHandlers } from './ipc/dialog'
import { registerConfigIpcHandlers } from './ipc/config'
import { registerImageIpcHandlers } from './ipc/image'
import { registerExportIpcHandlers } from './ipc/export'
import { registerWindowIpcHandlers } from './ipc/window'

let mainWindow: BrowserWindow | null = null
let allowClose = false
let dirtyCount = 0

interface WindowState {
  width: number
  height: number
  x?: number
  y?: number
  isMaximized?: boolean
}

function windowStatePath(): string {
  return join(app.getPath('userData'), 'window-state.json')
}

function loadWindowState(): WindowState | null {
  try {
    const raw = readFileSync(windowStatePath(), 'utf-8')
    const state = JSON.parse(raw) as WindowState
    if (typeof state.width !== 'number' || typeof state.height !== 'number') {
      return null
    }
    return {
      width: Math.max(800, state.width),
      height: Math.max(600, state.height),
      x: state.x,
      y: state.y,
      isMaximized: Boolean(state.isMaximized)
    }
  } catch {
    return null
  }
}

function saveWindowState(win: BrowserWindow): void {
  try {
    const state: WindowState = win.isMaximized()
      ? { width: 1200, height: 800, isMaximized: true }
      : { ...win.getBounds(), isMaximized: false }
    writeFileSync(windowStatePath(), JSON.stringify(state))
  } catch (e) {
    logger.error('Save window state failed', e)
  }
}

function sendToRenderer(channel: string, ...args: unknown[]): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, ...args)
  }
}

function createWindow(): void {
  logger.info('Creating main window...')

  const saved = loadWindowState()

  mainWindow = new BrowserWindow({
    width: saved?.width ?? 1200,
    height: saved?.height ?? 800,
    x: saved?.x,
    y: saved?.y,
    show: false,
    autoHideMenuBar: false,
    icon: join(__dirname, '../../resources/icon.ico'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: join(__dirname, '../preload/index.js'),
      webSecurity: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    if (saved?.isMaximized) mainWindow?.maximize()
    mainWindow?.show()
    logger.info('Main window shown')
  })

  // 有未保存文件时拦截关闭，交给渲染进程弹出保存提示
  mainWindow.on('close', (e) => {
    if (mainWindow) saveWindowState(mainWindow)
    if (!allowClose && dirtyCount > 0) {
      e.preventDefault()
      sendToRenderer('on:close-requested')
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
    logger.info('Main window closed')
  })
}

// 注册所有 IPC
function registerAllIpc(): void {
  registerFileIpcHandlers()
  registerDialogIpcHandlers()
  registerConfigIpcHandlers()
  registerImageIpcHandlers()
  registerExportIpcHandlers()
  registerWindowIpcHandlers()
  logger.debug('All IPC handlers registered')
}

// 处理命令行启动的文件路径
function processArgvFile(): string | null {
  if (process.argv.length > 1) {
    const args = process.argv.slice(is.dev ? 2 : 1) // dev 模式 electron cli 会加 2 个参数
    for (const a of args) {
      const low = a.toLowerCase()
      if (low.endsWith('.md') || low.endsWith('.markdown')) {
        return a
      }
    }
  }
  return null
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.my-markdown.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  nativeTheme.themeSource = 'system'

  registerAllIpc()

  // 渲染进程同步未保存数量，主进程据此拦截窗口关闭
  ipcMain.handle('invoke:window-set-dirty', (_event, count: number) => {
    dirtyCount = Math.max(0, Number(count) || 0)
  })

  // 渲染进程确认后真正关闭窗口
  ipcMain.handle('invoke:window-close', (event) => {
    allowClose = true
    const win = BrowserWindow.fromWebContents(event.sender)
    ;(win ?? mainWindow)?.close()
  })

  buildMenu()

  setupSingleInstance((filePath) => {
    logger.info('Second instance sent file:', filePath)
    sendToRenderer('on:file-opened', filePath)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  // 启动时如果命令行带了文件，打开
  const argvFile = processArgvFile()
  if (argvFile && mainWindow) {
    mainWindow.once('ready-to-show', () => {
      sendToRenderer('on:file-opened', argvFile)
    })
  }

  logger.info('App ready, version:', app.getVersion())
})

// macOS open-file
app.on('open-file', (e, filePath) => {
  e.preventDefault()
  logger.info('open-file event:', filePath)
  const low = filePath.toLowerCase()
  if (low.endsWith('.md') || low.endsWith('.markdown')) {
    if (!mainWindow) {
      app.whenReady().then(() => sendToRenderer('on:file-opened', filePath))
    } else {
      sendToRenderer('on:file-opened', filePath)
    }
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

export { mainWindow }
