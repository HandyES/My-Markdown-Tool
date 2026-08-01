import { useFileStore } from '../store/fileStore'
import { useCallback, useMemo } from 'react'
import type { VditorMode } from '@shared/types/file'

export function useTabs() {
  const tabs = useFileStore((s) => s.tabs)
  const activeTabId = useFileStore((s) => s.activeTabId)
  const setActiveTab = useFileStore((s) => s.setActiveTab)
  const closeTab = useFileStore((s) => s.closeTab)
  const closeAllTabs = useFileStore((s) => s.closeAllTabs)
  const closeOtherTabs = useFileStore((s) => s.closeOtherTabs)
  const setTabMode = useFileStore((s) => s.setTabMode)
  const getDirtyTabs = useFileStore((s) => s.getDirtyTabs)

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) || null,
    [tabs, activeTabId]
  )

  const switchMode = useCallback(
    (id: string, mode: VditorMode) => {
      setTabMode(id, mode)
    },
    [setTabMode]
  )

  const cycleMode = useCallback(
    (id: string) => {
      const tab = tabs.find((t) => t.id === id)
      if (!tab) return
      const modes: VditorMode[] = ['ir', 'sv', 'wysiwyg']
      const idx = modes.indexOf(tab.mode)
      const next = modes[(idx + 1) % modes.length]
      setTabMode(id, next)
    },
    [tabs, setTabMode]
  )

  // 关闭标签前的检查，由调用方处理弹窗
  const confirmCloseTab = useCallback(
    async (
      id: string,
      askSave: (tab: { name: string; content: string }) => Promise<
        'save' | 'discard' | 'cancel'
      >
    ): Promise<boolean> => {
      const tab = tabs.find((t) => t.id === id)
      if (!tab) return true
      if (!tab.isDirty) {
        closeTab(id)
        return true
      }
      const choice = await askSave(tab)
      if (choice === 'cancel') return false
      if (choice === 'save') {
        // 由上层执行保存，这里简单标记：由 caller 执行 save，成功后再 close
        return false
      }
      // discard
      closeTab(id)
      return true
    },
    [tabs, closeTab]
  )

  return {
    tabs,
    activeTab,
    activeTabId,
    setActiveTab,
    closeTab,
    closeAllTabs,
    closeOtherTabs,
    switchMode,
    cycleMode,
    getDirtyTabs,
    confirmCloseTab
  }
}
