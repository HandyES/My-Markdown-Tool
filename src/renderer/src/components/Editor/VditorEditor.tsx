import { useEffect, useRef } from 'react'
import { useVditor } from '../../hooks/useVditor'
import type { FileTab } from '@shared/types/file'
import type { AppConfig } from '@shared/types/config'
import { EditorContextMenu } from './EditorContextMenu'

import 'vditor/dist/index.css'

export function VditorEditor({
  tab,
  settings,
  theme,
  onContentChange,
  onPasteImage,
  onInsertImage,
  onInsertTable
}: {
  tab: FileTab
  settings: AppConfig['editor']
  theme: 'light' | 'dark' | 'auto'
  onContentChange: (value: string) => void
  onPasteImage?: (blob: Blob, ext: string) => Promise<boolean>
  onInsertImage?: () => void
  onInsertTable?: () => void
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const isDark =
    theme === 'dark' ||
    (theme === 'auto' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)

  const {
    vditorRef,
    ready,
    setValue,
    getValue,
    getHTML,
    setMode,
    setThemeFn,
    refreshMermaid,
    insertValue,
    focus
  } = useVditor({
    container: containerRef,
    initialValue: tab.content,
    initialMode: tab.mode,
    initialTheme: isDark ? 'dark' : 'classic',
    onChange: onContentChange,
    fontSize: settings.fontSize,
    fontFamily: settings.fontFamily,
    codeTheme: settings.codeTheme,
    tabSize: settings.tabSize,
    showLineNumber: settings.showLineNumber
  })

  // 初始化后同步主题（深色使用深色内容主题、代码高亮与 Mermaid 图表）
  useEffect(() => {
    if (!ready) return
    const dark = isDark
    setThemeFn(
      dark ? 'dark' : 'classic',
      dark ? 'dark' : 'light',
      dark ? 'github-dark' : settings.codeTheme
    )
    // Mermaid 脚本异步加载，稍后重绘以确保使用正确的亮/暗主题
    const t1 = window.setTimeout(() => refreshMermaid(dark ? 'dark' : 'classic'), 800)
    const t2 = window.setTimeout(() => refreshMermaid(dark ? 'dark' : 'classic'), 3000)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, isDark, setThemeFn, refreshMermaid, settings.codeTheme])


  // tab 切换 / mode 变更同步
  useEffect(() => {
    if (!ready) return
    setMode(tab.mode)
  }, [tab.mode, ready, setMode])

  // tab 切换时同步内容（如果不同）
  useEffect(() => {
    if (!ready) return
    if (getValue() !== tab.content) {
      setValue(tab.content)
    }
  }, [tab.id, tab.content, ready, getValue, setValue])

  // 暴露到 window 方便调用（菜单、快捷键）
  useEffect(() => {
    const w = window as unknown as {
      __vditorAPI?: {
        getValue: () => string
        getHTML: () => string
        insertValue?: (v: string, r?: boolean) => void
        focus?: () => void
        setTheme: (t: 'dark' | 'classic') => void
      }
    }
    w.__vditorAPI = {
      getValue,
      getHTML,
      setTheme: (t) => {
        setThemeFn(
          t,
          t === 'dark' ? 'dark' : 'light',
          t === 'dark' ? 'github-dark' : settings.codeTheme
        )
        // 主题切换后按新主题重绘 Mermaid
        window.setTimeout(() => refreshMermaid(t), 150)
      },
      insertValue: (v, r) => insertValue(v, r),
      focus: () => focus()
    }
    void vditorRef
    return () => {
      if (w.__vditorAPI?.getValue === getValue) {
        w.__vditorAPI = undefined
      }
    }
  }, [getValue, getHTML, setThemeFn, refreshMermaid, insertValue, focus, vditorRef, settings.codeTheme])

  // 粘贴图片本地化
  useEffect(() => {
    const root = containerRef.current
    if (!root) return

    const handlePaste = async (e: Event): Promise<void> => {
      const ev = e as unknown as ClipboardEvent
      if (!ev.clipboardData) return
      const items = Array.from(ev.clipboardData.items || [])
      const imgItem = items.find((i) => i.kind === 'file' && i.type.startsWith('image/'))
      if (!imgItem) return
      const file = imgItem.getAsFile()
      if (!file) return
      ev.preventDefault()
      const ext = imgItem.type.split('/')[1]?.replace('jpeg', 'jpg') || 'png'
      if (onPasteImage) {
        await onPasteImage(file, ext)
      }
    }

    root.addEventListener('paste', handlePaste as (e: Event) => void, true)
    return () =>
      root.removeEventListener('paste', handlePaste as (e: Event) => void, true)
  }, [onPasteImage, tab.id])

  // 拖拽图片文件到编辑器
  useEffect(() => {
    const root = containerRef.current
    if (!root) return

    const handleDragOver = (e: Event): void => {
      const ev = e as DragEvent
      if (ev.dataTransfer?.types.includes('Files')) {
        ev.preventDefault()
        ev.stopImmediatePropagation()
      }
    }

    const handleDrop = async (e: Event): Promise<void> => {
      const ev = e as DragEvent
      const files = ev.dataTransfer?.files
      if (!files || files.length === 0) return
      const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'))
      if (imageFiles.length === 0) return
      ev.preventDefault()
      ev.stopImmediatePropagation()
      for (const file of imageFiles) {
        const ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') || 'png'
        if (onPasteImage) await onPasteImage(file, ext)
      }
    }

    root.addEventListener('dragover', handleDragOver, true)
    root.addEventListener('drop', handleDrop as (e: Event) => void, true)
    return () => {
      root.removeEventListener('dragover', handleDragOver, true)
      root.removeEventListener('drop', handleDrop as (e: Event) => void, true)
    }
  }, [onPasteImage, tab.id])

  return (
    <EditorContextMenu
      filePath={tab.path}
      onInsertImage={onInsertImage}
      onInsertTable={onInsertTable}
    >
      <div ref={containerRef} className="h-full w-full" data-vditor-container />
    </EditorContextMenu>
  )
}
