import { create } from 'zustand'
import type { AppConfig } from '@shared/types/config'
import { DEFAULT_CONFIG } from '@shared/types/config'

interface SettingsStore {
  config: AppConfig
  loading: boolean

  loadConfig: () => Promise<void>
  updateConfig: (patch: Partial<AppConfig>) => Promise<void>
  setTheme: (theme: AppConfig['appearance']['theme']) => Promise<void>
  setEditorMode: (mode: AppConfig['editor']['defaultMode']) => Promise<void>
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  config: { ...DEFAULT_CONFIG },
  loading: true,

  loadConfig: async () => {
    try {
      const remoteCfg = (await window.api.configGet()) as AppConfig
      if (remoteCfg) {
        // 深度合并以防远程有缺失字段
        const merged: AppConfig = {
          ...DEFAULT_CONFIG,
          ...remoteCfg,
          editor: { ...DEFAULT_CONFIG.editor, ...(remoteCfg.editor ?? {}) },
          save: { ...DEFAULT_CONFIG.save, ...(remoteCfg.save ?? {}) },
          image: { ...DEFAULT_CONFIG.image, ...(remoteCfg.image ?? {}) },
          appearance: {
            ...DEFAULT_CONFIG.appearance,
            ...(remoteCfg.appearance ?? {})
          },
          session: {
            ...DEFAULT_CONFIG.session,
            ...(remoteCfg.session ?? {})
          }
        }
        set({ config: merged, loading: false })
      } else {
        set({ config: { ...DEFAULT_CONFIG }, loading: false })
      }
    } catch (e) {
      console.error('loadConfig failed', e)
      set({ config: { ...DEFAULT_CONFIG }, loading: false })
    }
  },

  updateConfig: async (patch) => {
    const next = {
      ...get().config,
      ...patch,
      editor: { ...get().config.editor, ...(patch.editor ?? {}) },
      save: { ...get().config.save, ...(patch.save ?? {}) },
      image: { ...get().config.image, ...(patch.image ?? {}) },
      appearance: {
        ...get().config.appearance,
        ...(patch.appearance ?? {})
      },
      session: {
        ...get().config.session,
        ...(patch.session ?? {})
      }
    }
    set({ config: next })
    try {
      await window.api.configSet(next)
    } catch (e) {
      console.error('updateConfig failed', e)
    }
  },

  setTheme: async (theme) => {
    await get().updateConfig({ appearance: { ...get().config.appearance, theme } })
  },

  setEditorMode: async (mode) => {
    await get().updateConfig({ editor: { ...get().config.editor, defaultMode: mode } })
  }
}))
