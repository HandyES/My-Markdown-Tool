import { useEffect, useRef, useState } from 'react'
import { useVditor } from '../../hooks/useVditor'
import type { FileTab } from '@shared/types/file'
import { Settings } from 'lucide-react'

import 'vditor/dist/index.css'

export function VditorEditor({
  tab,
  onContentChange,
  onPasteImage
}: {
  tab: FileTab
  onContentChange: (value: string) => void
  onPasteImage?: (blob: Blob, ext: string) => Promise<boolean>
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [showSettingsHint, setShowSettingsHint] = useState(false)

  const { vditorRef, ready, setValue, getValue, getHTML, setMode, setThemeFn, insertValue, focus } =
    useVditor({
      container: containerRef,
      initialValue: tab.content,
      initialMode: tab.mode,
      onChange: onContentChange
    })

  const setModeRef = useRef(setMode)
  setModeRef.current = setMode

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
      setTheme: (t) => setThemeFn?.(t),
      insertValue: (v, r) => insertValue(v, r),
      focus: () => focus()
    }
    void vditorRef
    return () => {
      if (w.__vditorAPI?.getValue === getValue) {
        w.__vditorAPI = undefined
      }
    }
  }, [getValue, getHTML, setThemeFn, insertValue, focus, vditorRef])

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
      const ext =
        imgItem.type.split('/')[1]?.replace('jpeg', 'jpg') || 'png'
      if (onPasteImage) {
        const ok = await onPasteImage(file, ext)
        if (ok) return
      }
    }

    root.addEventListener('paste', handlePaste as (e: Event) => void, true)
    return () =>
      root.removeEventListener('paste', handlePaste as (e: Event) => void, true)
  }, [onPasteImage, tab.id])

  return (
    <div className="relative flex-1 h-full w-full overflow-hidden bg-bg-primary">
      <div
        ref={containerRef}
        className="h-full w-full"
        data-vditor-container
      />
      <button
        onClick={() => {
          setShowSettingsHint(true)
        }}
        className="absolute bottom-2 right-2 opacity-0 hover:opacity-100 transition-opacity bg-bg-secondary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary rounded p-1 border border-[var(--border-color)] z-50"
        title="设置"
      >
        <Settings className="w-4 h-4" />
      </button>
      {showSettingsHint && (
        <div className="absolute top-2 right-2 bg-bg-secondary border border-[var(--border-color)] rounded p-2 text-xs text-text-secondary z-50 shadow">
          提示：设置可通过菜单「设置 → 偏好设置」或快捷键 Ctrl+, 打开
          <button
            className="ml-2 underline"
            onClick={() => setShowSettingsHint(false)}
          >
            知道了
          </button>
        </div>
      )}
    </div>
  )
}
