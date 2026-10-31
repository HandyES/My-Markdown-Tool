import { useEffect, useRef, useState } from 'react'
import {
  Scissors,
  Copy,
  ClipboardPaste,
  Image as ImageIcon,
  Table2,
  FolderOpen
} from 'lucide-react'
import { cn } from '../../lib/utils'

interface MenuState {
  x: number
  y: number
}

/**
 * 编辑器右键菜单：剪切 / 复制 / 粘贴 / 插入图片 / 插入表格 / 在资源管理器中打开
 * 使用 capture 阶段监听并阻止 Vditor 自带右键菜单
 */
export function EditorContextMenu({
  children,
  filePath,
  onInsertImage,
  onInsertTable
}: {
  children: React.ReactNode
  filePath: string | null
  onInsertImage?: () => void
  onInsertTable?: () => void
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [menu, setMenu] = useState<MenuState | null>(null)

  // 捕获 contextmenu，阻止 Vditor 默认菜单
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onContextMenu = (e: Event): void => {
      const ev = e as MouseEvent
      ev.preventDefault()
      ev.stopImmediatePropagation()
      const rect = el.getBoundingClientRect()
      setMenu({
        x: Math.min(ev.clientX - rect.left, rect.width - 200),
        y: Math.min(ev.clientY - rect.top, Math.max(0, rect.height - 240))
      })
    }
    el.addEventListener('contextmenu', onContextMenu, true)
    return () => el.removeEventListener('contextmenu', onContextMenu, true)
  }, [])

  // 点击外部 / Esc / 滚动时关闭
  useEffect(() => {
    if (!menu) return
    const onMouseDown = (e: MouseEvent): void => {
      if (menuRef.current && menuRef.current.contains(e.target as Node)) return
      setMenu(null)
    }
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setMenu(null)
    }
    const onScroll = (): void => setMenu(null)
    window.addEventListener('mousedown', onMouseDown, true)
    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('mousedown', onMouseDown, true)
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [menu])

  const close = (): void => setMenu(null)

  const exec = (command: 'cut' | 'copy' | 'paste'): void => {
    try {
      const ok = document.execCommand(command)
      if (!ok && command === 'paste') {
        void navigator.clipboard.readText().then((text) => {
          const w = window as unknown as {
            __vditorAPI?: { insertValue?: (v: string, r?: boolean) => void }
          }
          w.__vditorAPI?.insertValue?.(text, true)
        })
      }
    } catch {
      // ignore
    }
    close()
  }

  const items = [
    {
      key: 'cut',
      label: '剪切',
      icon: Scissors,
      shortcut: 'Ctrl+X',
      action: () => exec('cut'),
      disabled: false
    },
    {
      key: 'copy',
      label: '复制',
      icon: Copy,
      shortcut: 'Ctrl+C',
      action: () => exec('copy'),
      disabled: false
    },
    {
      key: 'paste',
      label: '粘贴',
      icon: ClipboardPaste,
      shortcut: 'Ctrl+V',
      action: () => exec('paste'),
      disabled: false
    },
    {
      key: 'split',
      label: '',
      icon: null,
      shortcut: '',
      action: () => undefined,
      disabled: true
    },
    {
      key: 'image',
      label: '插入图片',
      icon: ImageIcon,
      shortcut: 'Ctrl+Shift+I',
      action: () => {
        onInsertImage?.()
        close()
      },
      disabled: !onInsertImage
    },
    {
      key: 'table',
      label: '插入表格',
      icon: Table2,
      shortcut: 'Ctrl+T',
      action: () => {
        onInsertTable?.()
        close()
      },
      disabled: !onInsertTable
    },
    {
      key: 'split2',
      label: '',
      icon: null,
      shortcut: '',
      action: () => undefined,
      disabled: true
    },
    {
      key: 'folder',
      label: '在资源管理器中打开',
      icon: FolderOpen,
      shortcut: '',
      action: () => {
        if (filePath) void window.api.windowShowItemInFolder(filePath)
        close()
      },
      disabled: !filePath
    }
  ]

  return (
    <div ref={containerRef} className="relative flex-1 h-full w-full overflow-hidden">
      {children}
      {menu ? (
        <div
          ref={menuRef}
          className="absolute z-[1000] min-w-[200px] rounded-md border border-[var(--border-color)] bg-bg-secondary p-1 shadow-lg"
          style={{ left: menu.x, top: menu.y }}
        >
          {items.map((item) =>
            !item.icon ? (
              <div
                key={item.key}
                className="my-1 h-px bg-[var(--border-color)]"
              />
            ) : (
              <button
                key={item.key}
                disabled={item.disabled}
                onClick={item.action}
                className={cn(
                  'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-text-primary',
                  item.disabled
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:bg-bg-tertiary'
                )}
              >
                <item.icon className="w-3.5 h-3.5 opacity-70" />
                <span className="flex-1">{item.label}</span>
                {item.shortcut ? (
                  <span className="text-[10px] text-text-secondary">
                    {item.shortcut}
                  </span>
                ) : null}
              </button>
            )
          )}
        </div>
      ) : null}
    </div>
  )
}
