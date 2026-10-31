import { useRef, useEffect, useState, useCallback } from 'react'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Vditor 类型可能不完整，以运行时为准
import Vditor from 'vditor'
import type { VditorMode } from '@shared/types/file'

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
  changeMode?: (mode: 'ir' | 'sv' | 'wysiwyg') => void
  destroy?: () => void
  vditor?: { destroy?: () => void }
}

export type UseVditorOptions = {
  container: React.RefObject<HTMLDivElement>
  initialValue: string
  initialMode: VditorMode
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
      height: '100%',
      width: '100%',
      placeholder: '开始书写 Markdown...',
      // 使用随应用打包的静态资源，避免 CDN 与 CSP 冲突
      cdn: './vditor',
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
          current: 'light',
          path: './vditor/dist/css/content-theme'
        },
        hljs: { lineNumber: showLineNumber, style: codeTheme },
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

    return () => {
      disposed = true
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

  // 切换模式（不重建实例）
  useEffect(() => {
    const v = vditorRef.current
    if (!v) return
    try {
      if (typeof v.changeMode === 'function') {
        v.changeMode(modeRef.current)
      } else if (typeof v.setMode === 'function') {
        v.setMode(modeRef.current)
      }
    } catch (e) {
      console.warn('changeMode failed', e)
    }
  }, [initialMode, ready])

  const setMode = useCallback((mode: VditorMode) => {
    const v = vditorRef.current
    if (!v) return
    modeRef.current = mode
    try {
      if (typeof v.changeMode === 'function') {
        v.changeMode(mode)
      } else if (typeof v.setMode === 'function') {
        v.setMode(mode)
      }
    } catch (e) {
      console.warn('setMode failed', e)
    }
  }, [])

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
    setThemeFn
  }
}
