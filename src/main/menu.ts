import { Menu, app, BrowserWindow, dialog, shell } from 'electron'
import type { MenuItemConstructorOptions } from 'electron'
import logger from './lib/logger'

function sendToMain(channel: string, ...args: unknown[]): void {
  const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
  if (win) {
    win.webContents.send(channel, ...args)
  }
}

export function buildMenu(): void {
  const template: MenuItemConstructorOptions[] = [
    {
      label: '文件',
      submenu: [
        {
          label: '新建',
          accelerator: 'Ctrl+N',
          click: () => sendToMain('on:menu-action', 'file:new')
        },
        {
          label: '打开',
          accelerator: 'Ctrl+O',
          click: () => sendToMain('on:menu-action', 'file:open')
        },
        {
          label: '保存',
          accelerator: 'Ctrl+S',
          click: () => sendToMain('on:menu-action', 'file:save')
        },
        {
          label: '另存为',
          accelerator: 'Ctrl+Shift+S',
          click: () => sendToMain('on:menu-action', 'file:saveAs')
        },
        { type: 'separator' },
        {
          label: '导出',
          submenu: [
            {
              label: 'HTML',
              accelerator: 'Ctrl+Shift+E',
              click: () => sendToMain('on:menu-action', 'export:html')
            },
            {
              label: 'PDF',
              accelerator: 'Ctrl+Shift+P',
              click: () => sendToMain('on:menu-action', 'export:pdf')
            },
            {
              label: 'Markdown',
              click: () => sendToMain('on:menu-action', 'export:md')
            }
          ]
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: 'Ctrl+Q',
          click: () => {
            logger.info('Quit from menu')
            sendToMain('on:menu-action', 'app:quit')
          }
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', accelerator: 'Ctrl+Z', role: 'undo' },
        { label: '重做', accelerator: 'Ctrl+Y', role: 'redo' },
        { type: 'separator' },
        {
          label: '查找',
          accelerator: 'Ctrl+F',
          registerAccelerator: false,
          click: () => sendToMain('on:menu-action', 'edit:find')
        },
        {
          label: '替换',
          accelerator: 'Ctrl+H',
          registerAccelerator: false,
          click: () => sendToMain('on:menu-action', 'edit:replace')
        }
      ]
    },
    {
      label: '视图',
      submenu: [
        {
          label: '编辑模式',
          submenu: [
            {
              label: '即时渲染 (ir)',
              click: () => sendToMain('on:menu-action', 'mode:ir')
            },
            {
              label: '分屏预览 (sv)',
              click: () => sendToMain('on:menu-action', 'mode:sv')
            },
            {
              label: '所见即所得 (wysiwyg)',
              click: () => sendToMain('on:menu-action', 'mode:wysiwyg')
            }
          ]
        },
        { type: 'separator' },
        {
          label: '主题',
          submenu: [
            {
              label: '亮色',
              click: () => sendToMain('on:menu-action', 'theme:light')
            },
            {
              label: '暗色',
              click: () => sendToMain('on:menu-action', 'theme:dark')
            },
            {
              label: '跟随系统',
              click: () => sendToMain('on:menu-action', 'theme:auto')
            }
          ]
        },
        { type: 'separator' },
        {
          label: '侧栏',
          accelerator: 'Ctrl+Shift+O',
          click: () => sendToMain('on:menu-action', 'view:outline')
        },
        { type: 'separator' },
        { label: '放大', accelerator: 'Ctrl+=', role: 'zoomIn' },
        { label: '缩小', accelerator: 'Ctrl+-', role: 'zoomOut' },
        { label: '重置缩放', accelerator: 'Ctrl+0', role: 'resetZoom' },
        { type: 'separator' },
        { label: '全屏', accelerator: 'F11', role: 'togglefullscreen' }
      ]
    },
    {
      label: '插入',
      submenu: [
        {
          label: '粗体',
          accelerator: 'Ctrl+B',
          registerAccelerator: false,
          click: () => sendToMain('on:menu-action', 'insert:bold')
        },
        {
          label: '斜体',
          accelerator: 'Ctrl+I',
          registerAccelerator: false,
          click: () => sendToMain('on:menu-action', 'insert:italic')
        },
        {
          label: '链接',
          accelerator: 'Ctrl+K',
          registerAccelerator: false,
          click: () => sendToMain('on:menu-action', 'insert:link')
        },
        {
          label: '图片',
          accelerator: 'Ctrl+Shift+I',
          registerAccelerator: false,
          click: () => sendToMain('on:menu-action', 'insert:image')
        },
        {
          label: '代码块',
          accelerator: 'Ctrl+Shift+K',
          registerAccelerator: false,
          click: () => sendToMain('on:menu-action', 'insert:code')
        },
        {
          label: '表格',
          accelerator: 'Ctrl+T',
          registerAccelerator: false,
          click: () => sendToMain('on:menu-action', 'insert:table')
        },
        {
          label: '公式',
          accelerator: 'Ctrl+Shift+M',
          registerAccelerator: false,
          click: () => sendToMain('on:menu-action', 'insert:formula')
        }
      ]
    },
    {
      label: '设置',
      submenu: [
        {
          label: '偏好设置',
          accelerator: 'Ctrl+,',
          click: () => sendToMain('on:menu-action', 'settings:open')
        }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '快捷键参考',
          click: () => {
            dialog.showMessageBox({
              type: 'info',
              title: '快捷键参考',
              message: 'My Markdown 快捷键',
              detail: [
                '文件：新建 Ctrl+N / 打开 Ctrl+O / 保存 Ctrl+S / 另存为 Ctrl+Shift+S',
                '关闭标签 Ctrl+W / 退出 Ctrl+Q',
                '编辑：撤销 Ctrl+Z / 重做 Ctrl+Y / 查找 Ctrl+F / 替换 Ctrl+H',
                '模式切换 Ctrl+/',
                '主题 Ctrl+Alt+T / 侧栏（文件夹与大纲）Ctrl+Shift+O',
                '全屏 F11 / 放大 Ctrl+= / 缩小 Ctrl+- / 重置 Ctrl+0',
                '插入：粗体 Ctrl+B / 斜体 Ctrl+I / 链接 Ctrl+K / 图片 Ctrl+Shift+I',
                '插入：代码块 Ctrl+Shift+K / 表格 Ctrl+T / 公式 Ctrl+Shift+M',
                '导出：HTML Ctrl+Shift+E / PDF Ctrl+Shift+P'
              ].join('\n\n')
            })
          }
        },
        {
          label: '关于',
          click: () => {
            dialog.showMessageBox({
              type: 'info',
              title: '关于 My Markdown',
              message: 'My Markdown',
              detail: `版本：${app.getVersion()}\nElectron：${process.versions.electron}\nNode.js：${process.version}\nVditor：3.x\n\n类似 Typora 的 Markdown 编辑器`
            })
          }
        },
        { type: 'separator' },
        {
          label: '查看许可证',
          click: () => shell.openExternal('https://opensource.org/licenses/MIT')
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
  logger.debug('Menu built')
}
