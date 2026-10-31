/**
 * 渲染进程封装 window.api，避免各处直接访问 window
 */

export function api(): typeof window.api {
  if (!window.api) {
    throw new Error('window.api not exposed by preload script')
  }
  return window.api
}

export const ipc = {
  async fileNew(): Promise<void> {
    return api().fileNew()
  },
  async fileOpen(): Promise<{ path: string; content: string } | null> {
    return api().fileOpen()
  },
  async fileOpenPath(filePath: string): Promise<{ path: string; content: string } | null> {
    return api().fileOpenPath(filePath)
  },
  async fileSave(filePath: string, content: string): Promise<string | null> {
    return api().fileSave(filePath, content)
  },
  async fileSaveAs(content: string, defaultName?: string): Promise<string | null> {
    return api().fileSaveAs(content, defaultName)
  },
  async configGet(): Promise<unknown> {
    return api().configGet()
  },
  async configSet(config: unknown): Promise<void> {
    return api().configSet(config)
  },
  async imageLocalize(
    imageData: ArrayBuffer,
    docPath: string,
    ext = 'png'
  ): Promise<string> {
    return api().imageLocalize(imageData, docPath, ext)
  },
  async exportHtml(html: string, defaultName: string): Promise<string | null> {
    return api().exportHtml(html, defaultName)
  },
  async exportPdf(html: string, defaultName: string): Promise<string | null> {
    return api().exportPdf(html, defaultName)
  },
  async exportMd(markdown: string, defaultName: string): Promise<string | null> {
    return api().exportMd(markdown, defaultName)
  },
  async showItemInFolder(filePath: string): Promise<void> {
    return api().windowShowItemInFolder(filePath)
  },
  async setDirtyCount(count: number): Promise<void> {
    return api().windowSetDirty(count)
  },
  async closeWindow(): Promise<void> {
    return api().windowClose()
  },
  onCloseRequested(cb: () => void): () => void {
    return api().onCloseRequested(cb)
  },
  onFileOpened(cb: (p: string) => void): () => void {
    return api().onFileOpened(cb)
  },
  onMenuAction(cb: (action: string, payload?: unknown) => void): () => void {
    return api().onMenuAction(cb)
  }
}
