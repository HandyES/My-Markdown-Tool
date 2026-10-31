import { useMemo } from 'react'
import { cn } from '../../lib/utils'

interface Heading {
  level: number
  text: string
  index: number
}

/**
 * 解析 Markdown 中的 H1-H6 标题（跳过代码块）
 */
function parseHeadings(content: string): Heading[] {
  const lines = content.split(/\r?\n/)
  const headings: Heading[] = []
  let inFence = false
  let fence = ''

  for (const line of lines) {
    const trimmed = line.trim()
    const fenceMatch = /^(`{3,}|~{3,})/.exec(trimmed)
    if (fenceMatch) {
      if (!inFence) {
        inFence = true
        fence = fenceMatch[1][0]
      } else if (trimmed.startsWith(fence.repeat(3))) {
        inFence = false
      }
      continue
    }
    if (inFence) continue
    const m = /^(#{1,6})\s+(.+)$/.exec(line)
    if (m) {
      headings.push({
        level: m[1].length,
        text: m[2].replace(/\s*#+\s*$/, '').trim(),
        index: headings.length
      })
    }
  }
  return headings
}

export function OutlinePanel({
  content,
  visible,
  onJump
}: {
  content: string
  visible: boolean
  onJump: (index: number) => void
}) {
  const headings = useMemo(() => parseHeadings(content), [content])
  if (!visible) return null

  return (
    <aside className="w-56 shrink-0 h-full flex flex-col border-r border-[var(--border-color)] bg-bg-secondary overflow-hidden">
      <div className="h-8 shrink-0 flex items-center px-3 text-xs font-medium text-text-secondary border-b border-[var(--border-color)]">
        大纲
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {headings.length === 0 ? (
          <p className="px-3 py-2 text-xs text-text-secondary">
            暂无标题（使用 # 创建标题）
          </p>
        ) : (
          headings.map((h) => (
            <button
              key={`${h.index}-${h.text}`}
              onClick={() => onJump(h.index)}
              className={cn(
                'block w-full text-left truncate py-1 pr-2 text-xs text-text-secondary',
                'hover:bg-bg-tertiary hover:text-text-primary transition-colors',
                h.level === 1 && 'font-semibold text-text-primary',
                h.level >= 4 && 'opacity-80'
              )}
              style={{ paddingLeft: 12 + (h.level - 1) * 14 }}
              title={h.text}
            >
              {h.text}
            </button>
          ))
        )}
      </div>
    </aside>
  )
}
