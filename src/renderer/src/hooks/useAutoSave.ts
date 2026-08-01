import { useEffect, useRef } from 'react'
import { useSettingsStore } from '../store/settingsStore'
import { useFileStore } from '../store/fileStore'

export function useAutoSave(
  getCurrentContent: () => string,
  save: () => Promise<boolean>
) {
  const autoSaveEnabled = useSettingsStore(
    (s) => s.config.save.autoSave
  )
  const autoSaveInterval = useSettingsStore(
    (s) => s.config.save.autoSaveInterval
  )
  const saveOnBlur = useSettingsStore((s) => s.config.save.saveOnBlur)

  const activeTabId = useFileStore((s) => s.activeTabId)
  const activeTab = useFileStore((s) =>
    s.tabs.find((t) => t.id === s.activeTabId)
  )

  const timerRef = useRef<number | null>(null)

  // 防抖自动保存
  useEffect(() => {
    if (!autoSaveEnabled) return
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    const doSave = (): void => {
      if (activeTab && activeTab.path && activeTab.isDirty) {
        save().catch((e) => console.error('auto save failed', e))
      }
    }
    const ms = Math.max(1, Math.min(60, autoSaveInterval)) * 1000
    timerRef.current = window.setTimeout(doSave, ms)
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [
    autoSaveEnabled,
    autoSaveInterval,
    getCurrentContent,
    activeTabId,
    activeTab?.isDirty,
    activeTab?.path,
    save
  ])

  // 失焦保存
  useEffect(() => {
    if (!saveOnBlur) return
    const onBlur = (): void => {
      if (activeTab && activeTab.path && activeTab.isDirty) {
        save().catch((e) => console.error('blur save failed', e))
      }
    }
    window.addEventListener('blur', onBlur)
    return () => window.removeEventListener('blur', onBlur)
  }, [saveOnBlur, activeTab?.isDirty, activeTab?.path, save])

  return null
}
