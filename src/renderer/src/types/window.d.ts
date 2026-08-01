export interface PreloadAPI {
  fileNew(): Promise<void>
  fileOpen(): Promise<{ path: string; content: string } | null>
  fileOpenPath(filePath: string): Promise<{ path: string; content: string } | null>
  fileSave(filePath: string, content: string): Promise<string | null>
  fileSaveAs(content: string, defaultName?: string): Promise<string | null>

  configGet(): Promise<unknown>
  configSet(config: unknown): Promise<void>

  imageLocalize(
    imageData: ArrayBuffer,
    docPath: string,
    ext: string
  ): Promise<string>

  exportHtml(html: string, defaultName: string): Promise<string | null>
  exportPdf(html: string, defaultName: string): Promise<string | null>
  exportMd(markdown: string, defaultName: string): Promise<string | null>

  windowShowItemInFolder(filePath: string): Promise<void>
  windowGetNativeTheme(): Promise<'light' | 'dark' | 'auto'>

  onFileOpened(callback: (filePath: string) => void): () => void
  onMenuAction(callback: (action: string, payload?: unknown) => void): () => void
}

declare global {
  interface Window {
    api: PreloadAPI
    electronAPI: {
      isMaximized(): Promise<boolean>
      toggleMaximize(): Promise<void>
      minimize(): Promise<void>
      close(): Promise<void>
      platform: NodeJS.Platform
    }
  }
}

export {}
