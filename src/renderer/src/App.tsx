import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { FileTabs } from './components/Tabs/FileTabs'
import { VditorEditor } from './components/Editor/VditorEditor'
import { OutlinePanel } from './components/Outline/OutlinePanel'
import { FolderPanel } from './components/Sidebar/FolderPanel'
import { ExportDialog } from './components/Export/ExportDialog'
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

const MODE_LABELS: Record<VditorMode, string> = {
  ir: '即时渲染',
  sv: '分屏预览',
  wysiwyg: '所见即所得'
}

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
  const configLoading = useSettingsStore((s) => s.loading)
  const loadConfig = useSettingsStore((s) => s.loadConfig)

  const tabs = useFileStore((s) => s.tabs)
  const activeTabId = useFileStore((s) => s.activeTabId)
  const createNewTab = useFileStore((s) => s.createNewTab)
  const openTab = useFileStore((s) => s.openTab)
  const closeTab = useFileStore((s) => s.closeTab)
  const updateTabContent = useFileStore((s) => s.updateTabContent)
  const markTabSaved = useFileStore((s) => s.markTabSaved)
  const setTabMode = useFileStore((s) => s.setTabMode)
  const getDirtyTabs = useFileStore((s) => s.getDirtyTabs)

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) ?? null,
    [tabs, activeTabId]
  )

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [showOutline, setShowOutline] = useState(true)
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const restoredRef = useRef(false)

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
  const showToast = useCallback((message: string): void => {
    setToast(message)
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2500)
  }, [])

  // 启动加载配置，初始化第一个新标签
  useEffect(() => {
    let mounted = true
    ;(async () => {
      await loadConfig()
      if (!mounted) return
      if (tabs.length === 0) {
        createNewTab(useSettingsStore.getState().config.editor.defaultMode)
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

  // 会话恢复（配置加载完成后只执行一次）
  useEffect(() => {
    if (restoredRef.current || configLoading) return
    restoredRef.current = true
    if (!config.session.restoreOnStartup || config.session.lastOpenFiles.length === 0) return

    void (async () => {
      for (const p of config.session.lastOpenFiles) {
        try {
          const res = await ipc.fileOpenPath(p)
          if (res) openTab(res.path, res.content)
        } catch {
          // ignore
        }
      }
      // 关闭恢复前的空标签
      const current = useFileStore.getState()
      const empty = current.tabs.find((t) => t.path === null && t.content === '')
      if (empty && current.tabs.length > 1) current.closeTab(empty.id)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configLoading, config.session.restoreOnStartup, config.session.lastOpenFiles.length])

  // 保存会话到 config.session.lastOpenFiles
  useEffect(() => {
    if (tabs.length === 0) return
    const openFiles = tabs
      .filter((t) => t.path !== null)
      .map((t) => t.path as string)
    // 只有空白的未保存标签时不清空已有会话，避免与启动恢复竞争
    if (openFiles.length === 0) return
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

  const handleOpenSibling = useCallback(
    async (filePath: string) => {
      const existing = tabs.find((t) => t.path === filePath)
      if (existing) {
        useFileStore.getState().setActiveTab(existing.id)
        return
      }
      const res = await ipc.fileOpenPath(filePath)
      if (res) openTab(res.path, res.content)
    },
    [tabs, openTab]
  )

  const handleSave = useCallback(async (): Promise<boolean> => {
    if (!activeTab) return false
    const content = activeTab.content
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
    const content = activeTab.content
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

  // 获取当前 Vditor 渲染后的 HTML
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
      const md = activeTab.content

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
    [activeTab, getActiveHTML, showToast]
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
    showToast(`模式切换：${MODE_LABELS[next]}`)
  }, [activeTab, setTabMode])

  const handleSetMode = useCallback(
    (mode: VditorMode) => {
      if (!activeTab) return
      setTabMode(activeTab.id, mode)
    },
    [activeTab, setTabMode]
  )

  // ============ 图片本地化 ============
  const insertToEditor = useCallback((text: string): void => {
    const w = window as unknown as {
      __vditorAPI?: {
        insertValue?: (v: string, r?: boolean) => void
        focus?: () => void
      }
    }
    w.__vditorAPI?.focus?.()
    w.__vditorAPI?.insertValue?.(text, true)
  }, [])

  const handlePasteImage = useCallback(
    async (blob: Blob, ext: string): Promise<boolean> => {
      if (!activeTab) return false

      // 关闭本地化时，保留为内联 data URL
      if (!config.image.localize) {
        try {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(String(reader.result))
            reader.onerror = () => reject(reader.error)
            reader.readAsDataURL(blob)
          })
          insertToEditor(`\n![image](${dataUrl})\n`)
          return true
        } catch (e) {
          console.error('read image failed', e)
          showToast('图片读取失败')
          return false
        }
      }

      if (!activeTab.path) {
        showToast('请先保存文档，再粘贴图片')
        return false
      }
      try {
        const buffer = await blob.arrayBuffer()
        const relative = await ipc.imageLocalize(buffer, activeTab.path, ext)
        const name = formatNamePattern(config.image.namingPattern, new Date())
        insertToEditor(`\n![${name}](${relative})\n`)
        showToast('图片已本地化')
        return true
      } catch (e) {
        console.error('paste image failed', e)
        showToast('图片保存失败')
        return false
      }
    },
    [activeTab, config.image.localize, config.image.namingPattern, insertToEditor, showToast]
  )

  // 插入图片：打开文件选择器
  const handleInsertImage = useCallback((): void => {
    imageInputRef.current?.click()
  }, [])

  const handleImageSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
      const files = e.target.files
      if (!files || files.length === 0) return
      for (const file of Array.from(files)) {
        const ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') || 'png'
        // eslint-disable-next-line no-await-in-loop
        await handlePasteImage(file, ext)
      }
      e.target.value = ''
    },
    [handlePasteImage]
  )

  const handleInsertTable = useCallback((): void => {
    insertToEditor(
      '\n| 列 1 | 列 2 | 列 3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |\n\n'
    )
  }, [insertToEditor])

  // 大纲跳转
  const handleOutlineJump = useCallback((index: number): void => {
    const selectors = [
      '.vditor-ir .vditor-reset',
      '.vditor-wysiwyg .vditor-reset',
      '.vditor-preview .vditor-reset'
    ]
    for (const sel of selectors) {
      const root = document.querySelector(sel)
      if (!root) continue
      const nodes = root.querySelectorAll('h1, h2, h3, h4, h5, h6')
      if (nodes.length > index) {
        nodes[index].scrollIntoView({ block: 'start', behavior: 'smooth' })
        return
      }
    }
  }, [])

  // ============ 关闭拦截 ============
  const closeWithDirty = useCallback(
    async (id: string): Promise<boolean> => {
      const tab = tabs.find((t) => t.id === id)
      if (!tab) return true
      if (!tab.isDirty) return true
      setPendingQuit(false)
      setPendingCloseTab(id)
      return false // 暂停关闭，等待用户选择
    },
    [tabs]
  )

  const saveTabById = useCallback(
    async (id: string): Promise<boolean> => {
      const t = useFileStore.getState().tabs.find((x) => x.id === id)
      if (!t) return false
      const finalPath = t.path
        ? await ipc.fileSave(t.path, t.content)
        : await ipc.fileSaveAs(t.content, `${t.name || 'Untitled'}.md`)
      if (finalPath) {
        markTabSaved(t.id, finalPath)
        return true
      }
      return false
    },
    [markTabSaved]
  )

  const confirmDirtyClose = useCallback(
    async (choice: 'save' | 'discard' | 'cancel') => {
      const id = pendingCloseTab
      const quitAll = pendingQuit

      if (choice === 'cancel') {
        setPendingCloseTab(null)
        setPendingQuit(false)
        return
      }

      if (choice === 'save') {
        if (quitAll) {
          const dirtys = getDirtyTabs()
          for (const t of dirtys) {
            // eslint-disable-next-line no-await-in-loop
            const ok = await saveTabById(t.id)
            if (!ok) return // 用户取消保存对话框，中止退出
          }
        } else if (id) {
          const ok = await saveTabById(id)
          if (!ok) return
        }
      }

      setPendingCloseTab(null)
      setPendingQuit(false)

      if (quitAll) {
        useFileStore.getState().closeAllTabs()
        void ipc.closeWindow()
      } else if (id) {
        closeTab(id)
      }
    },
    [pendingCloseTab, pendingQuit, getDirtyTabs, saveTabById, closeTab]
  )

  // ========= 退出批量弹窗 =========
  const requestQuit = useCallback(() => {
    const dirtys = getDirtyTabs()
    if (dirtys.length === 0) {
      void ipc.closeWindow()
      return
    }
    setPendingQuit(true)
    setPendingCloseTab(dirtys[0].id)
  }, [getDirtyTabs])

  // 主进程拦截关闭时通知渲染进程弹出保存提示
  useEffect(() => {
    return ipc.onCloseRequested(() => {
      requestQuit()
    })
  }, [requestQuit])

  // 同步未保存数量给主进程，用于关闭拦截
  useEffect(() => {
    void ipc.setDirtyCount(tabs.filter((t) => t.isDirty).length)
  }, [tabs])

  // ========= 快捷键 =========
  // 其余快捷键已由主进程菜单 accelerator 统一处理，避免重复触发
  useShortcut([
    {
      combo: 'ctrl+w',
      description: '关闭标签',
      handler: () => {
        if (activeTabId) void closeWithDirty(activeTabId)
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
          setShowOutline((v) => !v)
          break
        case 'insert:bold':
          insertToEditor('**粗体文本**')
          break
        case 'insert:italic':
          insertToEditor('*斜体文本*')
          break
        case 'insert:link':
          insertToEditor('[链接文本](https://)')
          break
        case 'insert:image':
          handleInsertImage()
          break
        case 'insert:code':
          insertToEditor('\n```\n\n```\n')
          break
        case 'insert:table':
          handleInsertTable()
          break
        case 'insert:formula':
          insertToEditor('\n$$\n\n$$\n')
          break
        case 'app:quit':
          requestQuit()
          break
        case 'settings:open':
          setSettingsOpen(true)
          break
        default:
          break
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      handleNew,
      handleOpen,
      handleSave,
      handleSaveAs,
      handleExport,
      handleSetMode,
      switchTheme,
      insertToEditor,
      handleInsertImage,
      handleInsertTable,
      requestQuit
    ]
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
      <FileTabs onBeforeClose={closeWithDirty} />

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
              {MODE_LABELS[m]}
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
        <div className="w-px h-5 bg-[var(--border-color)] mx-2" />
        <button
          onClick={() => setShowOutline((v) => !v)}
          className={
            'px-2 py-1 rounded text-xs transition-colors ' +
            (showOutline
              ? 'bg-[var(--accent)] text-white'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary')
          }
          title="侧栏（文件夹与大纲）Ctrl+Shift+O"
        >
          侧栏
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
          <>
            {showOutline && (
              <aside className="w-56 shrink-0 h-full flex flex-col border-r border-[var(--border-color)] bg-bg-secondary overflow-hidden">
                <FolderPanel
                  filePath={activeTab.path}
                  activePath={activeTab.path}
                  onOpen={(p) => void handleOpenSibling(p)}
                />
                <OutlinePanel
                  content={activeTab.content}
                  onJump={handleOutlineJump}
                />
              </aside>
            )}
            <VditorEditor
              key={activeTab.id}
              tab={activeTab}
              settings={config.editor}
              theme={configTheme}
              onContentChange={(v) => updateTabContent(activeTab.id, v)}
              onPasteImage={handlePasteImage}
              onInsertImage={handleInsertImage}
              onInsertTable={handleInsertTable}
            />
          </>
        ) : null}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => void handleImageSelected(e)}
        />
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

      {/* 导出进度 */}
      <ExportDialog open={exportDialog.open} message={exportDialog.message} />

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

