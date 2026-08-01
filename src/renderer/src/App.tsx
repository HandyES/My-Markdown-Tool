import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { FileTabs } from './components/Tabs/FileTabs'
import { VditorEditor } from './components/Editor/VditorEditor'
import { SettingsDialog } from './components/Settings/SettingsDialog'
import { useFileStore } from './store/fileStore'
import { useSettingsStore } from './store/settingsStore'
import { useTheme } from './hooks/useTheme'
import { useShortcut } from './hooks/useShortcut'
import { ipc } from './utils/ipc'
import type { FileTab, VditorMode } from '@shared/types/file'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from './components/ui/dialog'
import { Button } from './components/ui/button'
import { basename } from './utils/path'
import { formatNamePattern } from './utils/fileName'

function useWordCount(content: string): {
  chars: number
  words: number
} {
  return useMemo(() => {
    const chars = content.length
    // 英文单词 + 中文字符
    const chineseCount = (content.match(/[\u4e00-\u9fa5]/g) || []).length
    const englishWords = (
      content
        .replace(/[\u4e00-\u9fa5]/g, ' ')
        .match(/[A-Za-z0-9_]+/g) || []
    ).length
    return { chars, words: chineseCount + englishWords }
  }, [content])
}

export default function App() {
  const { applyTheme, setTheme, configTheme } = useTheme()
  const config = useSettingsStore((s) => s.config)
  const loadConfig = useSettingsStore((s) => s.loadConfig)

  const tabs = useFileStore((s) => s.tabs)
  const activeTabId = useFileStore((s) => s.activeTabId)
  const createNewTab = useFileStore((s) => s.createNewTab)
  const openTab = useFileStore((s) => s.openTab)
  const closeTab = useFileStore((s) => s.closeTab)
  const setActiveTab = useFileStore((s) => s.setActiveTab)
  const updateTabContent = useFileStore((s) => s.updateTabContent)
  const markTabSaved = useFileStore((s) => s.markTabSaved)
  const setTabMode = useFileStore((s) => s.setTabMode)
  const getDirtyTabs = useFileStore((s) => s.getDirtyTabs)

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) ?? null,
    [tabs, activeTabId]
  )

  const [settingsOpen, setSettingsOpen] = useState(false)

  // 关闭时的提示
  const [pendingCloseTab, setPendingCloseTab] = useState<string | null>(null)
  const [pendingQuit, setPendingQuit] = useState(false)

  // 导出对话框进度
  const [exportDialog, setExportDialog] = useState<{
    open: boolean
    message: string
  }>({ open: false, message: '' })

  // 消息 toast
  const [toast, setToast] = useState<string | null>(null)
  const toastTimerRef = useRef<number | null>(null)
  const showToast = (message: string): void => {
    setToast(message)
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2500)
  }

  // 启动加载配置，初始化第一个新标签
  useEffect(() => {
    let mounted = true
    ;(async () => {
      await loadConfig()
      if (!mounted) return
      if (tabs.length === 0) {
        createNewTab()
      }
    })()
    return () => {
      mounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 主题变化时同步
  useEffect(() => {
    applyTheme(configTheme)
  }, [configTheme, applyTheme])

  // 监听 IPC 事件
  useEffect(() => {
    const unsubFile = ipc.onFileOpened(async (filePath) => {
      const res = await ipc.fileOpenPath(filePath)
      if (res) openTab(res.path, res.content)
    })
    const unsubMenu = ipc.onMenuAction((action) => {
      void handleMenuAction(action)
    })
    return () => {
      unsubFile()
      unsubMenu()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs, activeTabId])

  // 会话恢复
  useEffect(() => {
    if (
      config.session.restoreOnStartup &&
      config.session.lastOpenFiles.length > 0 &&
      tabs.length <= 1 &&
      tabs[0]?.path === null &&
      tabs[0]?.content === ''
    ) {
      void (async () => {
        for (const p of config.session.lastOpenFiles) {
          try {
            const res = await ipc.fileOpenPath(p)
            if (res) openTab(res.path, res.content)
          } catch {
            // ignore
          }
        }
        // 关闭空标签
        if (tabs[0] && tabs.length >= 2) closeTab(tabs[0].id)
      })()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.session.restoreOnStartup])

  // 保存会话到 config.session.lastOpenFiles
  useEffect(() => {
    if (tabs.length === 0) return
    const openFiles = tabs
      .filter((t) => t.path !== null)
      .map((t) => t.path as string)
    // 只在确实变更时写
    const prev = config.session.lastOpenFiles.join('\n')
    const next = openFiles.join('\n')
    if (prev !== next) {
      void useSettingsStore.getState().updateConfig({
        session: { ...config.session, lastOpenFiles: openFiles }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs.map((t) => t.path).join('|')])

  // ============== 业务动作 ==============
  const handleNew = useCallback(() => {
    createNewTab()
  }, [createNewTab])

  const handleOpen = useCallback(async () => {
    const res = await ipc.fileOpen()
    if (res) openTab(res.path, res.content)
  }, [openTab])

  const handleSave = useCallback(async (): Promise<boolean> => {
    if (!activeTab) return false
    const content = getActiveValue() ?? activeTab.content
    const finalPath = activeTab.path
      ? await ipc.fileSave(activeTab.path, content)
      : await ipc.fileSaveAs(content, `${activeTab.name || 'Untitled'}.md`)
    if (finalPath) {
      markTabSaved(activeTab.id, finalPath)
      showToast('已保存')
      return true
    }
    return false
  }, [activeTab, markTabSaved])

  const handleSaveAs = useCallback(async (): Promise<boolean> => {
    if (!activeTab) return false
    const content = getActiveValue() ?? activeTab.content
    const finalPath = await ipc.fileSaveAs(
      content,
      activeTab.path
        ? basename(activeTab.path)
        : `${activeTab.name || 'Untitled'}.md`
    )
    if (finalPath) {
      markTabSaved(activeTab.id, finalPath)
      showToast('已另存为')
      return true
    }
    return false
  }, [activeTab, markTabSaved])

  // 获取当前 Vditor 值
  const getActiveValue = useCallback((): string | null => {
    const w = window as unknown as {
      __vditorAPI?: { getValue?: () => string; getHTML?: () => string }
    }
    return w.__vditorAPI?.getValue?.() ?? null
  }, [])

  const getActiveHTML = useCallback((): string | null => {
    const w = window as unknown as {
      __vditorAPI?: { getValue?: () => string; getHTML?: () => string }
    }
    return w.__vditorAPI?.getHTML?.() ?? null
  }, [])

  const handleExport = useCallback(
    async (kind: 'html' | 'pdf' | 'md') => {
      if (!activeTab) return
      const defaultBase = activeTab.path
        ? basename(activeTab.path).replace(/\.[^.]+$/, '')
        : activeTab.name
      const md = getActiveValue() ?? activeTab.content

      setExportDialog({ open: true, message: '导出中...' })
      try {
        let result: string | null = null
        if (kind === 'html') {
          const html = getActiveHTML() ?? md
          result = await ipc.exportHtml(html, `${defaultBase}.html`)
        } else if (kind === 'pdf') {
          const html = getActiveHTML() ?? md
          result = await ipc.exportPdf(html, `${defaultBase}.pdf`)
        } else {
          result = await ipc.exportMd(md, `${defaultBase}.md`)
        }
        if (result) {
          showToast('导出成功')
        }
      } finally {
        setExportDialog({ open: false, message: '' })
      }
    },
    [activeTab, getActiveValue, getActiveHTML]
  )

  const switchTheme = useCallback(
    (theme: 'light' | 'dark' | 'auto') => {
      void setTheme(theme)
      showToast(`主题：${theme === 'light' ? '亮色' : theme === 'dark' ? '暗色' : '跟随系统'}`)
    },
    [setTheme]
  )

  const switchCycleTheme = useCallback(() => {
    const order: Array<'light' | 'dark' | 'auto'> = ['light', 'dark', 'auto']
    const idx = order.indexOf(configTheme as 'light' | 'dark' | 'auto')
    const next = order[(idx + 1) % order.length]
    void switchTheme(next)
  }, [configTheme, switchTheme])

  const handleModeSwitch = useCallback(() => {
    if (!activeTab) return
    const order: VditorMode[] = ['ir', 'sv', 'wysiwyg']
    const idx = order.indexOf(activeTab.mode)
    const next = order[(idx + 1) % order.length]
    setTabMode(activeTab.id, next)
    showToast(`模式切换：${next}`)
  }, [activeTab, setTabMode])

  const handleSetMode = useCallback(
    (mode: VditorMode) => {
      if (!activeTab) return
      setTabMode(activeTab.id, mode)
    },
    [activeTab, setTabMode]
  )

  // ============ 图片本地化 ============
  const handlePasteImage = useCallback(
    async (blob: Blob, ext: string): Promise<boolean> => {
      if (!activeTab) return false
      if (!config.image.localize) return false
      if (!activeTab.path) {
        setToastRef.current?.('请先保存文档，再粘贴图片')
        if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
        toastTimerRef.current = window.setTimeout(() => setToast(null), 3000)
        return false
      }
      try {
        const buffer = await blob.arrayBuffer()
        const relative = await ipc.imageLocalize(buffer, activeTab.path, ext)
        const name = formatNamePattern(config.image.namingPattern, new Date())
        const md = `![${name}](${relative})`
        // 插入到编辑器
        const w = window as unknown as {
          __vditorAPI?: {
            insertValue?: (v: string, r?: boolean) => void
            focus?: () => void
          }
        }
        w.__vditorAPI?.focus?.()
        w.__vditorAPI?.insertValue?.(`\n${md}\n`, true)
        showToast('图片已本地化')
        return true
      } catch (e) {
        console.error('paste image failed', e)
        showToast('图片保存失败')
        return false
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeTab, config.image.localize, config.image.namingPattern]
  )

  const setToastRef = useRef<(m: string) => void>(showToast)
  setToastRef.current = showToast

  // ============ 关闭拦截 ============
  const closeWithDirty = useCallback(
    async (id: string): Promise<boolean> => {
      const tab = tabs.find((t) => t.id === id)
      if (!tab) return true
      if (!tab.isDirty) {
        closeTab(id)
        return true
      }
      setPendingCloseTab(id)
      return false // 暂停关闭
    },
    [tabs, closeTab]
  )

  const confirmDirtyClose = useCallback(
    async (choice: 'save' | 'discard' | 'cancel') => {
      const id = pendingCloseTab
      const quitAll = pendingQuit
      setPendingCloseTab(null)
      setPendingQuit(false)

      const tab = id ? tabs.find((t) => t.id === id) : null

      if (choice === 'cancel') return

      // 保存逻辑
      if (choice === 'save') {
        if (tab && id) {
          const ok = await saveTabById(id)
          if (!ok) return // 用户取消了保存对话框
          closeTab(id)
        } else if (quitAll) {
          const dirtys = getDirtyTabs()
          for (const t of dirtys) {
            setActiveTab(t.id)
            // eslint-disable-next-line no-await-in-loop
            await saveTabById(t.id)
            closeTab(t.id)
          }
        }
      } else if (choice === 'discard') {
        if (id) closeTab(id)
        if (quitAll) {
          for (const t of tabs) closeTab(t.id)
        }
      }
    },
    [pendingCloseTab, pendingQuit, tabs, getDirtyTabs, closeTab, setActiveTab]
  )

  const saveTabById = useCallback(
    async (id: string): Promise<boolean> => {
      const t = tabs.find((x) => x.id === id)
      if (!t) return false
      const content = getActiveValue() ?? t.content
      const finalPath = t.path
        ? await ipc.fileSave(t.path, content)
        : await ipc.fileSaveAs(content, `${t.name || 'Untitled'}.md`)
      if (finalPath) {
        markTabSaved(t.id, finalPath)
        return true
      }
      return false
    },
    [tabs, getActiveValue, markTabSaved]
  )

  // ========= 退出批量弹窗 =========
  const requestQuit = useCallback(() => {
    const dirtys = getDirtyTabs()
    if (dirtys.length === 0) {
      window.close()
      return
    }
    setPendingQuit(true)
    setPendingCloseTab(dirtys[0].id)
  }, [getDirtyTabs])

  // ========= 快捷键 =========
  useShortcut([
    {
      combo: 'ctrl+n',
      description: '新建',
      handler: () => {
        handleNew()
      }
    },
    {
      combo: 'ctrl+o',
      description: '打开',
      handler: () => {
        void handleOpen()
      }
    },
    {
      combo: 'ctrl+s',
      description: '保存',
      handler: () => {
        void handleSave()
      }
    },
    {
      combo: 'ctrl+shift+s',
      description: '另存为',
      handler: () => {
        void handleSaveAs()
      }
    },
    {
      combo: 'ctrl+w',
      description: '关闭标签',
      handler: () => {
        if (activeTabId) void closeWithDirty(activeTabId)
      }
    },
    {
      combo: 'ctrl+q',
      description: '退出',
      handler: () => {
        requestQuit()
      }
    },
    {
      combo: 'ctrl+/',
      description: '切换编辑模式',
      handler: () => {
        handleModeSwitch()
      }
    },
    {
      combo: 'ctrl+alt+t',
      description: '切换主题',
      handler: () => {
        switchCycleTheme()
      }
    },
    {
      combo: 'ctrl+,',
      description: '设置',
      handler: () => {
        setSettingsOpen(true)
      }
    },
    {
      combo: 'ctrl+shift+e',
      description: '导出 HTML',
      handler: () => {
        void handleExport('html')
      }
    },
    {
      combo: 'ctrl+shift+p',
      description: '导出 PDF',
      handler: () => {
        void handleExport('pdf')
      }
    }
  ])

  // ========= 菜单动作 =========
  const handleMenuAction = useCallback(
    (action: string): void => {
      switch (action) {
        case 'file:new':
          handleNew()
          break
        case 'file:open':
          void handleOpen()
          break
        case 'file:save':
          void handleSave()
          break
        case 'file:saveAs':
          void handleSaveAs()
          break
        case 'export:html':
          void handleExport('html')
          break
        case 'export:pdf':
          void handleExport('pdf')
          break
        case 'export:md':
          void handleExport('md')
          break
        case 'edit:find':
        case 'edit:replace':
          // 依赖 vditor 内置快捷键；这里简单给个提示
          showToast('请使用编辑器 Ctrl+F / Ctrl+H 内置查找替换')
          break
        case 'mode:ir':
          handleSetMode('ir')
          break
        case 'mode:sv':
          handleSetMode('sv')
          break
        case 'mode:wysiwyg':
          handleSetMode('wysiwyg')
          break
        case 'theme:light':
          void switchTheme('light')
          break
        case 'theme:dark':
          void switchTheme('dark')
          break
        case 'theme:auto':
          void switchTheme('auto')
          break
        case 'view:outline':
          showToast('请点击编辑器工具栏 大纲 按钮')
          break
        case 'settings:open':
          setSettingsOpen(true)
          break
        default:
          break
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [handleNew, handleOpen, handleSave, handleSaveAs, handleExport, handleSetMode, switchTheme]
  )

  // ========= 自动保存 =========
  const autoSaveTimerRef = useRef<number | null>(null)
  useEffect(() => {
    if (autoSaveTimerRef.current) {
      window.clearInterval(autoSaveTimerRef.current)
      autoSaveTimerRef.current = null
    }
    if (!config.save.autoSave) return
    const interval = Math.max(1, Math.min(60, config.save.autoSaveInterval)) * 1000
    autoSaveTimerRef.current = window.setInterval(() => {
      if (!activeTab) return
      if (!activeTab.path || !activeTab.isDirty) return
      void saveTabById(activeTab.id)
    }, interval)
    return () => {
      if (autoSaveTimerRef.current) {
        window.clearInterval(autoSaveTimerRef.current)
        autoSaveTimerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    config.save.autoSave,
    config.save.autoSaveInterval,
    activeTab?.id,
    activeTab?.isDirty,
    activeTab?.path
  ])

  // 失焦保存
  useEffect(() => {
    if (!config.save.saveOnBlur) return
    const onBlur = (): void => {
      if (!activeTab?.path || !activeTab?.isDirty) return
      void saveTabById(activeTab.id)
    }
    window.addEventListener('blur', onBlur)
    return () => window.removeEventListener('blur', onBlur)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.save.saveOnBlur, activeTab?.id])

  // ========= 渲染 =========
  const stats = useWordCount(activeTab?.content ?? '')

  const dirtyTabs = pendingCloseTab
    ? pendingQuit
      ? getDirtyTabs()
      : [tabs.find((t) => t.id === pendingCloseTab)].filter(Boolean) as FileTab[]
    : []

  return (
    <div className="h-screen w-screen flex flex-col bg-bg-primary text-text-primary font-sans overflow-hidden">
      {/* 标签栏 */}
      <FileTabs
        onBeforeClose={closeWithDirty}
        openFilePrompt={async (askSave) => {
          if (!pendingCloseTab) return false
          await confirmDirtyClose(askSave === 'save' ? 'save' : 'discard')
          return true
        }}
      />

      {/* 工具栏：模式切换 + 快捷按钮 */}
      <div className="h-9 shrink-0 flex items-center gap-2 px-3 border-b border-[var(--border-color)] bg-bg-secondary">
        <div className="flex items-center gap-1 text-xs">
          {(['ir', 'sv', 'wysiwyg'] as VditorMode[]).map((m) => (
            <button
              key={m}
              onClick={() => handleSetMode(m)}
              className={
                'px-2 py-1 rounded text-xs transition-colors ' +
                (activeTab?.mode === m
                  ? 'bg-[var(--accent)] text-white'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary')
              }
            >
              {m.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="w-px h-5 bg-[var(--border-color)] mx-2" />
        <button
          onClick={() => void handleSave()}
          className="px-2 py-1 rounded text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
          title="保存 Ctrl+S"
        >
          保存
        </button>
        <button
          onClick={() => void handleSaveAs()}
          className="px-2 py-1 rounded text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
          title="另存为 Ctrl+Shift+S"
        >
          另存为
        </button>
        <div className="w-px h-5 bg-[var(--border-color)] mx-2" />
        <button
          onClick={() => void handleExport('html')}
          className="px-2 py-1 rounded text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
        >
          导出HTML
        </button>
        <button
          onClick={() => void handleExport('pdf')}
          className="px-2 py-1 rounded text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
        >
          导出PDF
        </button>
        <button
          onClick={() => void handleExport('md')}
          className="px-2 py-1 rounded text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
        >
          导出MD
        </button>
        <div className="flex-1" />
        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => switchTheme('light')}
            className={
              'px-2 py-1 rounded transition-colors ' +
              (configTheme === 'light'
                ? 'bg-[var(--accent)] text-white'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary')
            }
            title="亮色"
          >
            ☀
          </button>
          <button
            onClick={() => switchTheme('dark')}
            className={
              'px-2 py-1 rounded transition-colors ' +
              (configTheme === 'dark'
                ? 'bg-[var(--accent)] text-white'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary')
            }
            title="暗色"
          >
            ☾
          </button>
          <button
            onClick={() => switchTheme('auto')}
            className={
              'px-2 py-1 rounded transition-colors ' +
              (configTheme === 'auto'
                ? 'bg-[var(--accent)] text-white'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary')
            }
            title="跟随系统"
          >
            ⚙
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="px-2 py-1 rounded text-text-secondary hover:text-text-primary hover:bg-bg-tertiary ml-1"
            title="设置 Ctrl+,"
          >
            设置
          </button>
        </div>
      </div>

      {/* 主内容 */}
      <main className="flex-1 flex relative overflow-hidden">
        {tabs.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-text-secondary">
            <div className="text-center">
              <p>没有打开的文档</p>
              <button
                className="mt-4 px-4 py-2 rounded bg-[var(--accent)] text-white hover:opacity-90"
                onClick={handleNew}
              >
                新建文档
              </button>
            </div>
          </div>
        ) : activeTab ? (
          <VditorEditor
            key={activeTab.id}
            tab={activeTab}
            onContentChange={(v) => updateTabContent(activeTab.id, v)}
            onPasteImage={handlePasteImage}
          />
        ) : null}
      </main>

      {/* 状态栏 */}
      <footer className="h-6 shrink-0 border-t border-[var(--border-color)] bg-bg-tertiary flex items-center px-4 gap-4 text-xs text-text-secondary">
        <span className="truncate max-w-[40%]">
          {activeTab
            ? activeTab.path || `${activeTab.name}（未保存）`
            : '就绪'}
        </span>
        <span className="flex-1" />
        <span>模式：{activeTab?.mode.toUpperCase() ?? '-'}</span>
        <span>字符：{stats.chars}</span>
        <span>词数：{stats.words}</span>
        {activeTab?.path ? (
          <button
            className="hover:underline"
            onClick={() => ipc.showItemInFolder(activeTab.path!)}
            title="在资源管理器中打开"
          >
            📂 打开文件夹
          </button>
        ) : null}
      </footer>

      {/* Toast */}
      {toast ? (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded shadow-lg text-sm z-[9999] pointer-events-none transition-opacity animate-in fade-in-0">
          {toast}
        </div>
      ) : null}

      {/* 设置 */}
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

      {/* 导出 */}
      <Dialog open={exportDialog.open} onOpenChange={() => {}}>
        <DialogContent showClose={false} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>导出</DialogTitle>
            <DialogDescription>{exportDialog.message}</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <div className="h-2 w-full bg-bg-tertiary rounded overflow-hidden">
              <div className="h-full w-1/3 bg-[var(--accent)] animate-pulse rounded" />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 未保存关闭 / 退出 */}
      <Dialog
        open={Boolean(pendingCloseTab)}
        onOpenChange={(open) => {
          if (!open) confirmDirtyClose('cancel').catch(() => {})
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {pendingQuit ? '是否在退出前保存更改？' : '是否保存更改？'}
            </DialogTitle>
            <DialogDescription className="mt-3 space-y-1">
              {dirtyTabs.map((t) => (
                <div
                  key={t.id}
                  className="px-2 py-1 rounded bg-bg-secondary border border-[var(--border-color)] text-sm"
                >
                  • {t.isDirty ? '● ' : ''}
                  {t.path ?? t.name}
                </div>
              ))}
              {pendingQuit && dirtyTabs.length < getDirtyTabs().length ? (
                <div className="text-xs text-text-secondary mt-1">
                  还有 {getDirtyTabs().length - dirtyTabs.length} 个文档未保存
                </div>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => confirmDirtyClose('cancel')}
            >
              取消
            </Button>
            <Button
              variant="ghost"
              onClick={() => confirmDirtyClose('discard')}
              className="text-destructive hover:text-destructive"
            >
              不保存
            </Button>
            <Button variant="default" onClick={() => confirmDirtyClose('save')}>
              {pendingQuit ? '全部保存' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

