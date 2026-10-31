import { useCallback, useEffect } from 'react'
import { useSettingsStore } from '../store/settingsStore'

type Theme = 'light' | 'dark' | 'auto'

export function useTheme() {
  const configTheme = useSettingsStore((s) => s.config.appearance.theme)
  const setThemeStore = useSettingsStore((s) => s.setTheme)

  const applyTheme = useCallback((theme: Theme) => {
    let shouldDark = false
    if (theme === 'auto') {
      shouldDark =
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
    } else {
      shouldDark = theme === 'dark'
    }
    const root = document.documentElement
    if (shouldDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    // 同步 Vditor 编辑器内核主题
    const w = window as unknown as {
      __vditorAPI?: { setTheme?: (t: 'dark' | 'classic') => void }
    }
    w.__vditorAPI?.setTheme?.(shouldDark ? 'dark' : 'classic')
  }, [])

  const setTheme = useCallback(
    async (theme: Theme) => {
      applyTheme(theme)
      await setThemeStore(theme)
    },
    [applyTheme, setThemeStore]
  )

  // 应用初始主题（配置中读取）
  useEffect(() => {
    applyTheme(configTheme)
  }, [configTheme, applyTheme])

  // auto 模式下监听系统主题变化
  useEffect(() => {
    if (configTheme !== 'auto') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (): void => applyTheme('auto')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [configTheme, applyTheme])

  return { applyTheme, setTheme, configTheme }
}
