import { useEffect, useState } from 'react'
import { cn } from '../../lib/utils'
import { dirname, basename } from '../../utils/path'
import { ipc } from '../../utils/ipc'

interface FolderFile {
  name: string
  path: string
}

/**
 * 展示当前文档所在目录下的其他 Markdown 文件
 */
export function FolderPanel({
  filePath,
  activePath,
  onOpen
}: {
  filePath: string | null
  activePath: string | null
  onOpen: (path: string) => void
}) {
  const [files, setFiles] = useState<FolderFile[]>([])
  const dir = filePath ? dirname(filePath) : ''

  useEffect(() => {
    let cancelled = false
    if (!dir) {
      setFiles([])
      return
    }
    void ipc.folderListMd(dir).then((list) => {
      if (!cancelled) setFiles(list)
    })
    return () => {
      cancelled = true
    }
  }, [dir, activePath])

  return (
    <section className="flex flex-col max-h-[45%] shrink-0 min-h-0">
      <div className="h-8 shrink-0 flex items-center px-3 text-xs font-medium text-text-secondary border-b border-[var(--border-color)]">
        <span className="truncate" title={dir}>
          {dir ? `文件夹 · ${basename(dir)}` : '当前文件夹'}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {!filePath ? (
          <p className="px-3 py-2 text-xs text-text-secondary">
            保存文档后显示同目录的 Markdown 文件
          </p>
        ) : files.length === 0 ? (
          <p className="px-3 py-2 text-xs text-text-secondary">该目录下暂无其他 Markdown 文件</p>
        ) : (
          files.map((f) => {
            const isActive = f.path === activePath
            return (
              <button
                key={f.path}
                onClick={() => onOpen(f.path)}
                className={cn(
                  'block w-full text-left truncate py-1 px-3 text-xs transition-colors',
                  isActive
                    ? 'text-[var(--accent)] font-medium'
                    : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                )}
                title={f.path}
              >
                {f.name}
              </button>
            )
          })
        )}
      </div>
    </section>
  )
}
