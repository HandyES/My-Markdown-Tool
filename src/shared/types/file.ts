export type VditorMode = 'ir' | 'sv' | 'wysiwyg'

export interface FileTab {
  id: string
  path: string | null
  content: string
  originalContent: string
  name: string
  isDirty: boolean
  mode: VditorMode
  scrollPosition: number
  cursorPosition?: { top: number; left: number } | null
}
