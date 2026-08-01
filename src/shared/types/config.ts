export interface AppConfig {
  editor: {
    defaultMode: 'ir' | 'sv' | 'wysiwyg'
    fontSize: number
    fontFamily: string
    codeTheme: string
    tabSize: 2 | 4 | 8
    showLineNumber: boolean
  }
  save: {
    autoSave: boolean
    autoSaveInterval: number
    saveOnBlur: boolean
  }
  image: {
    localize: boolean
    directory: string
    namingPattern: string
  }
  appearance: {
    theme: 'light' | 'dark' | 'auto'
    windowSize: { width: number; height: number }
  }
  session: {
    restoreOnStartup: boolean
    lastOpenFiles: string[]
  }
}

export const DEFAULT_CONFIG: AppConfig = {
  editor: {
    defaultMode: 'ir',
    fontSize: 16,
    fontFamily:
      'system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif',
    codeTheme: 'github',
    tabSize: 4,
    showLineNumber: true
  },
  save: {
    autoSave: true,
    autoSaveInterval: 3,
    saveOnBlur: true
  },
  image: {
    localize: true,
    directory: 'assets',
    namingPattern: 'image-YYYYMMDD-HHmmss'
  },
  appearance: {
    theme: 'auto',
    windowSize: { width: 1200, height: 800 }
  },
  session: {
    restoreOnStartup: true,
    lastOpenFiles: []
  }
}
