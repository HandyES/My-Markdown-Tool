import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// 严格暴露必要 API
const api = {
  // 文件操作
  fileNew: (): Promise<void> => ipcRenderer.invoke('invoke:file-new'),
  fileOpen: (): Promise<{ path: string; content: string } | null> =>
    ipcRenderer.invoke('invoke:file-open'),
  fileOpenPath: (filePath: string): Promise<{ path: string; content: string } | null> =>
    ipcRenderer.invoke('invoke:file-open-path', filePath),
  fileSave: (filePath: string, content: string): Promise<string | null> =>
    ipcRenderer.invoke('invoke:file-save', filePath, content),
  fileSaveAs: (content: string, defaultName?: string): Promise<string | null> =>
    ipcRenderer.invoke('invoke:file-save-as', content, defaultName),

  // 配置操作
  configGet: (): Promise<unknown> => ipcRenderer.invoke('invoke:config-get'),
  configSet: (config: unknown): Promise<void> =>
    ipcRenderer.invoke('invoke:config-set', config),

  // 图片本地化
  imageLocalize: (
    imageData: ArrayBuffer,
    docPath: string,
    ext: string
  ): Promise<string> =>
    ipcRenderer.invoke('invoke:image-localize', imageData, docPath, ext),

  // 导出
  exportHtml: (html: string, defaultName: string): Promise<string | null> =>
    ipcRenderer.invoke('invoke:export-html', html, defaultName),
  exportPdf: (html: string, defaultName: string): Promise<string | null> =>
    ipcRenderer.invoke('invoke:export-pdf', html, defaultName),
  exportMd: (markdown: string, defaultName: string): Promise<string | null> =>
    ipcRenderer.invoke('invoke:export-md', markdown, defaultName),

  // 窗口
  windowShowItemInFolder: (filePath: string): Promise<void> =>
    ipcRenderer.invoke('invoke:window-show-item-in-folder', filePath),
  windowGetNativeTheme: (): Promise<'light' | 'dark' | 'auto'> =>
    ipcRenderer.invoke('invoke:window-get-native-theme'),
  windowSetDirty: (count: number): Promise<void> =>
    ipcRenderer.invoke('invoke:window-set-dirty', count),
  windowClose: (): Promise<void> => ipcRenderer.invoke('invoke:window-close'),

  // 主进程 -> 渲染进程事件监听
  onFileOpened: (callback: (filePath: string) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, p: string): void => callback(p)
    ipcRenderer.on('on:file-opened', listener)
    return () => ipcRenderer.removeListener('on:file-opened', listener)
  },
  onMenuAction: (callback: (action: string, payload?: unknown) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, a: string, p: unknown): void => callback(a, p)
    ipcRenderer.on('on:menu-action', listener)
    return () => ipcRenderer.removeListener('on:menu-action', listener)
  },
  onCloseRequested: (callback: () => void): (() => void) => {
    const listener = (): void => callback()
    ipcRenderer.on('on:close-requested', listener)
    return () => ipcRenderer.removeListener('on:close-requested', listener)
  }
}

// 使用 contextBridge 安全暴露
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (fallback for non-isolated)
  window.electronAPI = electronAPI
  // @ts-ignore
  window.api = api
}
