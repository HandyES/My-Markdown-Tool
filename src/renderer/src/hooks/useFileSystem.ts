import { useFileStore } from '../store/fileStore'
import { useCallback } from 'react'

export function useFileSystem() {
  const createNewTab = useFileStore((s) => s.createNewTab)
  const openTab = useFileStore((s) => s.openTab)
  const markTabSaved = useFileStore((s) => s.markTabSaved)
  const updateTabContent = useFileStore((s) => s.updateTabContent)
  const activeTab = useFileStore((s) =>
    s.tabs.find((t) => t.id === s.activeTabId)
  )

  const newFile = useCallback(() => {
    createNewTab()
  }, [createNewTab])

  const openFile = useCallback(async () => {
    const result = await window.api.fileOpen()
    if (result) {
      openTab(result.path, result.content)
      return true
    }
    return false
  }, [openTab])

  const openFilePath = useCallback(
    async (filePath: string) => {
      const result = await window.api.fileOpenPath(filePath)
      if (result) {
        openTab(result.path, result.content)
        return true
      }
      return false
    },
    [openTab]
  )

  const saveFile = useCallback(async () => {
    if (!activeTab) return false
    try {
      const finalPath = await window.api.fileSave(
        activeTab.path || '',
        activeTab.content
      )
      if (finalPath) {
        markTabSaved(activeTab.id, finalPath)
        return true
      }
      return false
    } catch (e) {
      console.error('saveFile failed', e)
      return false
    }
  }, [activeTab, markTabSaved])

  const saveFileAs = useCallback(async () => {
    if (!activeTab) return false
    const defaultName = activeTab.path
      ? activeTab.name
      : `${activeTab.name || 'Untitled'}.md`
    try {
      const finalPath = await window.api.fileSaveAs(
        activeTab.content,
        defaultName
      )
      if (finalPath) {
        markTabSaved(activeTab.id, finalPath)
        updateTabContent(activeTab.id, activeTab.content) // 使 isDirty=false
        return true
      }
      return false
    } catch (e) {
      console.error('saveFileAs failed', e)
      return false
    }
  }, [activeTab, markTabSaved, updateTabContent])

  return {
    newFile,
    openFile,
    openFilePath,
    saveFile,
    saveFileAs
  }
}
