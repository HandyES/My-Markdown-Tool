import { useEffect } from 'react'

type ShortcutHandler = (e: KeyboardEvent) => void | boolean

interface ShortcutBinding {
  combo: string
  handler: ShortcutHandler
  description?: string
}

/**
 * 简单快捷键监听，不使用 globalShortcut（避免影响其他应用）
 * combo: "ctrl+n", "ctrl+shift+s", "ctrl+/", "f11" 等
 */
function matchCombo(e: KeyboardEvent, combo: string): boolean {
  const parts = combo.toLowerCase().split('+')
  let hasCtrl = false
  let hasShift = false
  let hasAlt = false
  let hasMeta = false
  let key = ''

  for (const p of parts) {
    if (p === 'ctrl' || p === 'control') {
      hasCtrl = true
    } else if (p === 'shift') {
      hasShift = true
    } else if (p === 'alt') {
      hasAlt = true
    } else if (p === 'meta' || p === 'cmd' || p === 'win') {
      hasMeta = true
    } else {
      key = p
    }
  }

  if (hasCtrl !== (e.ctrlKey || e.metaKey)) return false
  if (hasShift !== e.shiftKey) return false
  if (hasAlt !== e.altKey) return false
  if (hasMeta && !e.metaKey) return false

  const eventKey = e.key.toLowerCase()
  if (key === 'plus' || key === '=') {
    return eventKey === '+' || eventKey === '='
  }
  if (key === 'minus' || key === '-') {
    return eventKey === '-' || eventKey === '_'
  }
  if (key.length === 1) {
    return eventKey === key
  }
  return eventKey === `f${key}` || eventKey === key
}

export function useShortcut(bindings: ShortcutBinding[]) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      for (const b of bindings) {
        if (matchCombo(e, b.combo)) {
          const result = b.handler(e)
          if (result !== false) {
            e.preventDefault()
            e.stopPropagation()
          }
          return
        }
      }
    }
    window.addEventListener('keydown', onKeyDown as (e: Event) => void, true)
    return () =>
      window.removeEventListener(
        'keydown',
        onKeyDown as (e: Event) => void,
        true
      )
  }, [bindings])
}
