import { create } from 'zustand'
import type { FileTab, VditorMode } from '@shared/types/file'
import { useSettingsStore } from './settingsStore'

interface FileStore {
  tabs: FileTab[]
  activeTabId: string | null

  // 操作
  createNewTab: (mode?: VditorMode) => void
  openTab: (path: string, content: string) => void
  closeTab: (id: string) => void
  setActiveTab: (id: string) => void
  updateTabContent: (id: string, content: string) => void
  markTabSaved: (id: string, path: string) => void
  setTabMode: (id: string, mode: VditorMode) => void
  updateScrollPosition: (id: string, position: number) => void
  closeAllTabs: () => void
  closeOtherTabs: (id: string) => void
  getDirtyTabs: () => FileTab[]
}

let nextId = 1

function defaultMode(): VditorMode {
  return useSettingsStore.getState().config.editor.defaultMode
}

function makeNewTab(id: string, mode: VditorMode = 'ir'): FileTab {
  return {
    id,
    path: null,
    content: '',
    originalContent: '',
    name: '新建文档',
    isDirty: false,
    mode,
    scrollPosition: 0,
    cursorPosition: null
  }
}

export const useFileStore = create<FileStore>((set, get) => ({
  tabs: [],
  activeTabId: null,

  createNewTab: (mode) => {
    const id = `tab-${Date.now()}-${nextId++}`
    const newTab = makeNewTab(id, mode ?? defaultMode())
    set((s) => ({
      tabs: [...s.tabs, newTab],
      activeTabId: id
    }))
  },

  openTab: (path, content) => {
    const { tabs } = get()
    const existing = tabs.find((t) => t.path === path)
    if (existing) {
      set({ activeTabId: existing.id })
      return
    }
    const id = `tab-${Date.now()}-${nextId++}`
    const basename = path.split(/[\\/]/).pop() || 'Untitled'
    const tab: FileTab = {
      id,
      path,
      content,
      originalContent: content,
      name: basename,
      isDirty: false,
      mode: defaultMode(),
      scrollPosition: 0,
      cursorPosition: null
    }
    set((s) => ({
      tabs: [...s.tabs, tab],
      activeTabId: id
    }))
  },

  closeTab: (id) => {
    set((s) => {
      const idx = s.tabs.findIndex((t) => t.id === id)
      const newTabs = s.tabs.filter((t) => t.id !== id)
      let activeTabId = s.activeTabId
      if (s.activeTabId === id) {
        if (newTabs.length === 0) {
          activeTabId = null
        } else if (idx < newTabs.length) {
          activeTabId = newTabs[idx].id
        } else {
          activeTabId = newTabs[newTabs.length - 1].id
        }
      }
      return { tabs: newTabs, activeTabId }
    })
  },

  setActiveTab: (id) => set({ activeTabId: id }),

  updateTabContent: (id, content) => {
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === id
          ? {
              ...t,
              content,
              isDirty: content !== t.originalContent
            }
          : t
      )
    }))
  },

  markTabSaved: (id, path) => {
    set((s) => ({
      tabs: s.tabs.map((t) => {
        if (t.id !== id) return t
        const basename = path.split(/[\\/]/).pop() || 'Untitled'
        return {
          ...t,
          path,
          originalContent: t.content,
          isDirty: false,
          name: basename
        }
      })
    }))
  },

  setTabMode: (id, mode) => {
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, mode } : t))
    }))
  },

  updateScrollPosition: (id, position) => {
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === id ? { ...t, scrollPosition: position } : t
      )
    }))
  },

  closeAllTabs: () => set({ tabs: [], activeTabId: null }),

  closeOtherTabs: (id) => {
    set((s) => ({
      tabs: s.tabs.filter((t) => t.id === id),
      activeTabId: id
    }))
  },

  getDirtyTabs: () => {
    return get().tabs.filter((t) => t.isDirty)
  }
}))
