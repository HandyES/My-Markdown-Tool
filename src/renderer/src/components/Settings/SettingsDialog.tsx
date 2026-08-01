import { useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '../ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Label } from '@radix-ui/react-label'
import { Input } from '../ui/input'
import { Slider } from '../ui/slider'
import { Switch } from '../ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select'
import { useSettingsStore } from '../../store/settingsStore'

export function SettingsDialog({
  open,
  onOpenChange
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const config = useSettingsStore((s) => s.config)
  const loadConfig = useSettingsStore((s) => s.loadConfig)
  const updateConfig = useSettingsStore((s) => s.updateConfig)
  const loading = useSettingsStore((s) => s.loading)

  useEffect(() => {
    if (open && loading) loadConfig()
  }, [open, loading, loadConfig])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>偏好设置</DialogTitle>
          <DialogDescription>
            所有设置会自动保存并实时生效
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="editor" className="w-full">
          <TabsList className="grid grid-cols-5 mb-4">
            <TabsTrigger value="editor">编辑器</TabsTrigger>
            <TabsTrigger value="save">保存</TabsTrigger>
            <TabsTrigger value="image">图片</TabsTrigger>
            <TabsTrigger value="appearance">外观</TabsTrigger>
            <TabsTrigger value="session">会话</TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="space-y-5">
            <div className="space-y-2">
              <Label>默认编辑模式</Label>
              <Select
                value={config.editor.defaultMode}
                onValueChange={(v) =>
                  updateConfig({
                    editor: {
                      ...config.editor,
                      defaultMode: v as typeof config.editor.defaultMode
                    }
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ir">即时渲染 (ir)</SelectItem>
                  <SelectItem value="sv">分屏预览 (sv)</SelectItem>
                  <SelectItem value="wysiwyg">所见即所得 (wysiwyg)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>字号：{config.editor.fontSize}px</Label>
              <Slider
                min={12}
                max={24}
                step={1}
                value={[config.editor.fontSize]}
                onValueChange={(vs) =>
                  updateConfig({
                    editor: { ...config.editor, fontSize: vs[0] }
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>字体族</Label>
              <Input
                value={config.editor.fontFamily}
                onChange={(e) =>
                  updateConfig({
                    editor: { ...config.editor, fontFamily: e.target.value }
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>代码主题</Label>
              <Select
                value={config.editor.codeTheme}
                onValueChange={(v) =>
                  updateConfig({
                    editor: { ...config.editor, codeTheme: v }
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="github">github</SelectItem>
                  <SelectItem value="monokai">monokai</SelectItem>
                  <SelectItem value="dracula">dracula</SelectItem>
                  <SelectItem value="atom-one-dark">atom-one-dark</SelectItem>
                  <SelectItem value="vs">vs</SelectItem>
                  <SelectItem value="xcode">xcode</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tab 空格数</Label>
              <Select
                value={String(config.editor.tabSize)}
                onValueChange={(v) =>
                  updateConfig({
                    editor: {
                      ...config.editor,
                      tabSize: Number(v) as 2 | 4 | 8
                    }
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                  <SelectItem value="8">8</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label>显示行号（sv 模式）</Label>
              <Switch
                checked={config.editor.showLineNumber}
                onCheckedChange={(v) =>
                  updateConfig({
                    editor: { ...config.editor, showLineNumber: v }
                  })
                }
              />
            </div>
          </TabsContent>

          <TabsContent value="save" className="space-y-5">
            <div className="flex items-center justify-between">
              <Label>自动保存</Label>
              <Switch
                checked={config.save.autoSave}
                onCheckedChange={(v) =>
                  updateConfig({
                    save: { ...config.save, autoSave: v }
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>
                自动保存间隔：{config.save.autoSaveInterval} 秒
              </Label>
              <Slider
                disabled={!config.save.autoSave}
                min={1}
                max={60}
                step={1}
                value={[config.save.autoSaveInterval]}
                onValueChange={(vs) =>
                  updateConfig({
                    save: { ...config.save, autoSaveInterval: vs[0] }
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>失焦自动保存</Label>
              <Switch
                checked={config.save.saveOnBlur}
                onCheckedChange={(v) =>
                  updateConfig({
                    save: { ...config.save, saveOnBlur: v }
                  })
                }
              />
            </div>
          </TabsContent>

          <TabsContent value="image" className="space-y-5">
            <div className="flex items-center justify-between">
              <Label>图片本地化</Label>
              <Switch
                checked={config.image.localize}
                onCheckedChange={(v) =>
                  updateConfig({
                    image: { ...config.image, localize: v }
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>图片存放目录名（相对于文档目录）</Label>
              <Input
                value={config.image.directory}
                onChange={(e) =>
                  updateConfig({
                    image: { ...config.image, directory: e.target.value }
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>图片命名格式（支持 YYYY MM DD HH mm ss）</Label>
              <Input
                value={config.image.namingPattern}
                onChange={(e) =>
                  updateConfig({
                    image: { ...config.image, namingPattern: e.target.value }
                  })
                }
              />
            </div>
          </TabsContent>

          <TabsContent value="appearance" className="space-y-5">
            <div className="space-y-2">
              <Label>主题</Label>
              <Select
                value={config.appearance.theme}
                onValueChange={(v) =>
                  updateConfig({
                    appearance: {
                      ...config.appearance,
                      theme: v as typeof config.appearance.theme
                    }
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">亮色</SelectItem>
                  <SelectItem value="dark">暗色</SelectItem>
                  <SelectItem value="auto">跟随系统</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-text-secondary">
              窗口大小仅记住上次状态，下次自动恢复
            </p>
          </TabsContent>

          <TabsContent value="session" className="space-y-5">
            <div className="flex items-center justify-between">
              <Label>启动恢复上次会话</Label>
              <Switch
                checked={config.session.restoreOnStartup}
                onCheckedChange={(v) =>
                  updateConfig({
                    session: { ...config.session, restoreOnStartup: v }
                  })
                }
              />
            </div>
            <p className="text-xs text-text-secondary">
              启用后，将自动加载上次退出时打开的文件（文件不存在则跳过）
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
