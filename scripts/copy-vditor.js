/**
 * 将 Vditor 运行时静态资源复制到渲染进程 public 目录，
 * 使编辑器在离线和 CSP 限制下也能加载静态资源（不使用 CDN）。
 */
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const src = path.join(root, 'node_modules/vditor/dist')
const dest = path.join(root, 'src/renderer/public/vditor/dist')

const entries = [
  'js/lute',
  'js/highlight.js',
  'js/katex',
  'js/mathjax',
  'js/i18n',
  'js/icons',
  'css',
  'images'
]

const completeMarker = path.join(dest, 'js/icons/ant.js')

// 清理旧版目录结构（曾直接复制到 public/vditor 下）
const legacy = path.join(root, 'src/renderer/public/vditor')
for (const old of ['js', 'css', 'images']) {
  const p = path.join(legacy, old)
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true })
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true })
  for (const item of fs.readdirSync(from, { withFileTypes: true })) {
    const s = path.join(from, item.name)
    const d = path.join(to, item.name)
    if (item.isDirectory()) copyDir(s, d)
    else fs.copyFileSync(s, d)
  }
}

if (!fs.existsSync(src)) {
  console.warn('[copy-vditor] node_modules/vditor 不存在，跳过')
  process.exit(0)
}

if (fs.existsSync(completeMarker)) {
  console.log('[copy-vditor] 已存在，跳过复制')
  process.exit(0)
}

console.log('[copy-vditor] 复制 Vditor 静态资源...')
for (const entry of entries) {
  const from = path.join(src, entry)
  if (!fs.existsSync(from)) continue
  copyDir(from, path.join(dest, entry))
}
console.log('[copy-vditor] 完成')
