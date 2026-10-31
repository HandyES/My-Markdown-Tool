import { useRef, useEffect, useState, useCallback } from 'react'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Vditor 类型可能不完整，以运行时为准
import Vditor from 'vditor'
import type { VditorMode } from '@shared/types/file'

const CDN = './vditor'

type VditorInstance = {
  getValue: () => string
  setValue: (v: string) => void
  getHTML: () => string
  insertValue: (v: string, render?: boolean) => void
  focus: () => void
  setTheme: (
    theme: 'dark' | 'classic',
    contentTheme?: string,
    codeTheme?: string
  ) => void
  setMode: (mode: 'ir' | 'sv' | 'wysiwyg') => void
  getCurrentMode?: () => VditorMode
  changeMode?: (mode: 'ir' | 'sv' | 'wysiwyg') => void
  destroy?: () => void
  vditor?: { destroy?: () => void }
}

// Vditor 的 IR 模式会把内联 HTML（<sub>/<sup>/<mark>/<u>/<small> 等）渲染为隐藏的源码标记，
// 只显示文本、不应用语义样式。这里把这些标记对之间的内容包进真实元素用于显示；
// 标记文本仍保留在同一个 html-inline 容器内，因此 Lute 序列化（getValue/getHTML）不受影响。
const INLINE_HTML_TAGS = new Set([
  'sub',
  'sup',
  'mark',
  'u',
  'small',
  's',
  'ins',
  'del',
  'abbr',
  'cite',
  'q',
  'time',
  'b',
  'i',
  'em',
  'strong'
])

const MARKER_CODE_SELECTOR = 'code.vditor-ir__marker'

function patchInlineHtml(root: ParentNode): void {
  const spans = root.querySelectorAll<HTMLElement>('span[data-type="html-inline"]')
  if (spans.length === 0) return

  const selection = document.getSelection()
  const range =
    selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null
  const selectionInside = (node: Node): boolean =>
    !!range &&
    (node.contains(range.startContainer) || node.contains(range.endContainer))

  Array.from(spans).forEach((open) => {
    if (!open.parentElement) return
    // 已经处理过（内部包含嵌套的 html-inline 容器）
    if (open.querySelector('span[data-type="html-inline"]')) return
    // 光标位于其中时保持源码标记展开，避免打断编辑
    if (open.classList.contains('vditor-ir__node--expand')) return
    if (selectionInside(open)) return

    const code = open.querySelector(MARKER_CODE_SELECTOR)
    if (!code) return
    const marker = code.textContent?.trim() ?? ''
    const match = marker.match(/^<([a-zA-Z][\w-]*)(?:\s[^>]*)?>$/)
    if (!match) return
    const tag = match[1].toLowerCase()
    if (!INLINE_HTML_TAGS.has(tag)) return

    let close: HTMLElement | null = null
    for (let s = open.nextElementSibling; s; s = s.nextElementSibling) {
      if (s instanceof HTMLElement && s.matches('span[data-type="html-inline"]')) {
        const closeCode = s.querySelector(MARKER_CODE_SELECTOR)
        if (closeCode && (closeCode.textContent?.trim() ?? '') === `</${tag}>`) {
          close = s
          break
        }
      }
    }
    if (!close) return
    if (close.classList.contains('vditor-ir__node--expand')) return
    if (selectionInside(close)) return

    const real = document.createElement(tag)
    let node = open.nextSibling
    while (node && node !== close) {
      const next = node.nextSibling
      real.appendChild(node)
      node = next
    }
    open.appendChild(real)
    open.appendChild(close)
  })
}

export type UseVditorOptions = {
  container: React.RefObject<HTMLDivElement>
  initialValue: string
  initialMode: VditorMode
  initialTheme?: 'dark' | 'classic'
  onChange: (value: string) => void
  fontSize?: number
  fontFamily?: string
  codeTheme?: string
  tabSize?: 2 | 4 | 8
  showLineNumber?: boolean
}

export function useVditor(opts: UseVditorOptions) {
  const {
    container,
    initialValue,
    initialMode,
    initialTheme = 'classic',
    onChange,
    fontSize = 16,
    fontFamily,
    codeTheme = 'github',
    tabSize = 4,
    showLineNumber = true
  } = opts

  const vditorRef = useRef<VditorInstance | null>(null)
  const modeRef = useRef<VditorMode>(initialMode)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    modeRef.current = initialMode
  }, [initialMode])

  useEffect(() => {
    if (!container.current) return
    if (vditorRef.current) return

    let disposed = false
    const placeholder = container.current
    const vditor = new Vditor(placeholder, {
      value: initialValue || '',
      mode: initialMode,
      theme: initialTheme,
      height: '100%',
      width: '100%',
      placeholder: '开始书写 Markdown...',
      // 使用随应用打包的静态资源，避免 CDN 与 CSP 冲突
      cdn: CDN,
      // 初始化完成后再标记 ready，避免过早调用实例方法
      after: () => {
        if (!disposed) setReady(true)
      },
      outline: { enable: false, position: 'left' },
      toolbarConfig: { pin: true },
      counter: { enable: true, type: 'markdown' },
      tab: '\u0020'.repeat(tabSize),
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - 某些 vditor 版本允许
      lineNumber: showLineNumber,
      cache: { enable: false },
      hideToolbar: false,
      preview: {
        theme: {
          current: initialTheme === 'dark' ? 'dark' : 'light',
          path: './vditor/dist/css/content-theme'
        },
        hljs: {
          lineNumber: showLineNumber,
          style: initialTheme === 'dark' ? 'github-dark' : codeTheme
        },
        markdown: { toc: true, mark: true, footnotes: true, autoSpace: true },
        actions: []
      },
      toolbar: [
        'emoji',
        'headings',
        'bold',
        'italic',
        'strike',
        'link',
        '|',
        'list',
        'ordered-list',
        'check',
        'outdent',
        'indent',
        '|',
        'quote',
        'line',
        'code',
        'inline-code',
        'insert-before',
        'insert-after',
        '|',
        'table',
        'upload',
        '|',
        'undo',
        'redo',
        '|',
        'fullscreen',
        'edit-mode',
        {
          name: 'more',
          toolbar: [
            'both',
            'code-theme',
            'content-theme',
            'export',
            'preview',
            'fullscreen'
          ]
        }
      ],
      input(value: string) {
        onChange(value)
      }
    }) as unknown as VditorInstance

    // 设置字体大小
    try {
      if (placeholder && placeholder.style) {
        placeholder.style.fontSize = `${fontSize}px`
        if (fontFamily) placeholder.style.fontFamily = fontFamily
      }
    } catch {
      // ignore
    }

    vditorRef.current = vditor

    // 内联 HTML（上下标等）显示修复：IR 重绘后把标记对之间的内容包成真实元素
    let patchRaf = 0
    let applyingPatch = false
    const applyPatch = (): void => {
      patchRaf = 0
      if (applyingPatch || !placeholder) return
      applyingPatch = true
      try {
        placeholder
          .querySelectorAll<HTMLElement>('.vditor-ir pre.vditor-reset')
          .forEach((el) => patchInlineHtml(el))
      } finally {
        applyingPatch = false
      }
    }
    const schedulePatch = (): void => {
      if (applyingPatch || patchRaf) return
      patchRaf = window.requestAnimationFrame(applyPatch)
    }
    const patchObserver = new MutationObserver(schedulePatch)
    patchObserver.observe(placeholder, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    })
    schedulePatch()

    return () => {
      disposed = true
      patchObserver.disconnect()
      if (patchRaf) window.cancelAnimationFrame(patchRaf)
      try {
        const v = vditorRef.current
        if (v && typeof v.destroy === 'function') {
          v.destroy()
        } else if (v && v.vditor && typeof v.vditor.destroy === 'function') {
          v.vditor.destroy()
        }
      } catch {
        // ignore
      }
      vditorRef.current = null
      setReady(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [container])

  // 字号 / 字体实时生效（模式切换后 Vditor 会重建内容容器）
  useEffect(() => {
    if (!ready) return
    const apply = (): void => {
      const root = container.current
      if (!root) return
      const targets = new Set<HTMLElement>([])
      targets.add(root)
      root.querySelectorAll<HTMLElement>('.vditor-reset').forEach((el) => targets.add(el))
      targets.forEach((el) => {
        el.style.fontSize = `${fontSize}px`
        if (fontFamily) el.style.fontFamily = fontFamily
      })
    }
    apply()
    const t1 = window.setTimeout(apply, 50)
    const t2 = window.setTimeout(apply, 400)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [ready, initialMode, fontSize, fontFamily])

  // 切换模式（Vditor 3.x 未暴露 setMode API，通过内置 edit-mode 按钮切换）
  const setMode = useCallback((mode: VditorMode) => {
    const root = container.current
    if (!root) return
    modeRef.current = mode
    if (vditorRef.current?.getCurrentMode?.() === mode) return
    const btn = root.querySelector<HTMLButtonElement>(`button[data-mode="${mode}"]`)
    if (btn) {
      btn.click()
    } else {
      console.warn('mode button not found', mode)
    }
  }, [])

  // 模式变更（tab 切换 / 首次就绪）
  useEffect(() => {
    if (!ready) return
    setMode(modeRef.current)
  }, [ready, initialMode, setMode])

  const setValue = useCallback((value: string) => {
    const v = vditorRef.current
    if (!v) return
    try {
      if (v.getValue() !== value) {
        v.setValue(value)
      }
    } catch {
      // ignore
    }
  }, [])

  const getValue = useCallback(() => {
    return vditorRef.current?.getValue() ?? ''
  }, [])

  const getHTML = useCallback(() => {
    return vditorRef.current?.getHTML() ?? ''
  }, [])

  const insertValue = useCallback((value: string, render = true) => {
    vditorRef.current?.insertValue(value, render)
  }, [])

  const focus = useCallback(() => {
    vditorRef.current?.focus()
  }, [])

  const setThemeFn = useCallback(
    (theme: 'dark' | 'classic', contentTheme = 'light', codeTheme?: string) => {
      const v = vditorRef.current
      if (!v) return
      try {
        v.setTheme(theme, contentTheme, codeTheme)
      } catch (e) {
        console.warn('setTheme failed', e)
      }
    },
    []
  )

  // Vditor.setTheme 不会重绘 Mermaid，切换主题后需按新主题重新渲染
  const refreshMermaid = useCallback((theme: 'dark' | 'classic') => {
    const root = container.current
    if (!root) return
    const rendered = Array.from(
      root.querySelectorAll<HTMLElement>('.language-mermaid')
    ).filter((el) => !!el.querySelector('svg') || el.getAttribute('data-processed') === 'true')
    if (rendered.length === 0) return
    // 已渲染的 Mermaid 区块内容被替换为 SVG，需要恢复图表定义：IR 模式取相邻源码，其余按 Markdown 顺序
    const value = vditorRef.current?.getValue() ?? ''
    const codes = Array.from(value.matchAll(/```mermaid\s*\n([\s\S]*?)```/g)).map((m) => m[1])
    const api = Vditor as unknown as {
      mermaidRender?: (el: HTMLElement, cdn: string, theme: string) => void
    }
    if (!api.mermaidRender) return
    const targets = new Set<HTMLElement>()
    rendered.forEach((el, i) => {
      let code = codes[i]
      const preview = el.closest('.vditor-ir__preview')
      if (preview) {
        const sibling = preview.previousElementSibling?.querySelector('code.language-mermaid')
        if (sibling?.textContent) code = sibling.textContent
      }
      el.removeAttribute('data-processed')
      if (code !== undefined) el.textContent = code
      const target = preview ?? el.closest('.vditor-reset')
      if (target) targets.add(target as HTMLElement)
    })
    targets.forEach((el) => {
      try {
        api.mermaidRender?.(el, CDN, theme === 'dark' ? 'dark' : 'classic')
      } catch (e) {
        console.warn('mermaidRender failed', e)
      }
    })
  }, [])

  return {
    vditorRef,
    ready,
    setValue,
    getValue,
    getHTML,
    insertValue,
    focus,
    setTheme: setThemeFn,
    setMode,
    setThemeFn,
    refreshMermaid
  }
}
