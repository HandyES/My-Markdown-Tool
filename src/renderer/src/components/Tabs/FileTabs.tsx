import { useFileStore } from '../../store/fileStore'
import { X, FileText, Circle } from 'lucide-react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger
} from '../ui/context-menu'
import { cn } from '../../lib/utils'
import { ipc } from '../../utils/ipc'

export function TabItem({
  id: _id,
  name,
  path,
  isDirty,
  isActive,
  onClick,
  onClose,
  onCloseOthers,
  onCloseAll,
  onCopyPath,
  onShowInFolder
}: {
  id: string
  name: string
  path: string | null
  isDirty: boolean
  isActive: boolean
  onClick: () => void
  onClose: () => void
  onCloseOthers: () => void
  onCloseAll: () => void
  onCopyPath: () => void
  onShowInFolder: () => void
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          onClick={onClick}
          className={cn(
            'group flex items-center h-10 min-w-[160px] max-w-[240px] px-3 pr-1 border-r border-[var(--border-color)] cursor-pointer select-none transition-colors',
            isActive
              ? 'bg-bg-primary text-text-primary border-b border-b-bg-primary -mb-px z-10 relative'
              : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary'
          )}
        >
          <FileText className="w-4 h-4 shrink-0 mr-2 opacity-70" />
          {isDirty ? (
            <Circle className="w-3 h-3 fill-[#ff7875] text-[#ff7875] shrink-0 mr-1.5" />
          ) : null}
          <span className="truncate text-sm">{name}</span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            className={cn(
              'ml-2 shrink-0 w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity',
              'hover:bg-[var(--bg-tertiary)]',
              'text-text-secondary hover:text-text-primary'
            )}
            title="关闭 (Ctrl+W)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="min-w-[180px]">
        <ContextMenuItem onClick={onClose}>关闭</ContextMenuItem>
        <ContextMenuItem onClick={onCloseOthers}>关闭其他</ContextMenuItem>
        <ContextMenuItem onClick={onCloseAll}>关闭所有</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onCopyPath} disabled={!path}>
          复制路径
        </ContextMenuItem>
        <ContextMenuItem onClick={onShowInFolder} disabled={!path}>
          在资源管理器中打开
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

export function FileTabs({
  onBeforeClose
}: {
  onBeforeClose?: (id: string) => Promise<boolean>
}) {
  const tabs = useFileStore((s) => s.tabs)
  const activeTabId = useFileStore((s) => s.activeTabId)
  const setActiveTab = useFileStore((s) => s.setActiveTab)
  const closeTab = useFileStore((s) => s.closeTab)
  const closeOtherTabs = useFileStore((s) => s.closeOtherTabs)
  const closeAllTabs = useFileStore((s) => s.closeAllTabs)
  const createNewTab = useFileStore((s) => s.createNewTab)

  const handleClose = async (id: string): Promise<void> => {
    const tab = tabs.find((t) => t.id === id)
    if (!tab) return
    // 未保存时由 App 弹出保存提示并返回 false；保存/放弃后再执行关闭
    const ok = await onBeforeClose?.(id)
    if (ok === false) return
    closeTab(id)
  }

  return (
    <div className="h-10 flex items-start bg-bg-secondary border-b border-[var(--border-color)] overflow-x-auto">
      <div className="flex h-10">
        {tabs.map((tab) => (
          <TabItem
            key={tab.id}
            id={tab.id}
            name={tab.name}
            path={tab.path}
            isDirty={tab.isDirty}
            isActive={tab.id === activeTabId}
            onClick={() => setActiveTab(tab.id)}
            onClose={() => handleClose(tab.id)}
            onCloseOthers={() => closeOtherTabs(tab.id)}
            onCloseAll={() => closeAllTabs()}
            onCopyPath={async () => {
              if (tab.path) {
                await navigator.clipboard.writeText(tab.path)
              }
            }}
            onShowInFolder={() => {
              if (tab.path) ipc.showItemInFolder(tab.path)
            }}
          />
        ))}
      </div>
      <button
        onClick={() => createNewTab()}
        className="h-10 px-3 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary border-r border-[var(--border-color)]"
        title="新建 (Ctrl+N)"
      >
        +
      </button>
      <div className="flex-1 h-10 bg-bg-secondary" />
    </div>
  )
}
