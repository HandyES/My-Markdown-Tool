// 生成简单的占位 ICO 文件（16x16 / 32x32 纯色 + 简单几何图形）
// 运行: node scripts/make-ico.js
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

// BMP 无压缩信息头（256 色 8bpp 用调色板，简化用 32bpp ARGB）
function makeIco(sizes, rgbaFn, outPath) {
  const entries = sizes.map((s) => ({ size: s }))
  const dirEntrySize = 16
  // ICO 头 6 字节 + N*16 字节目录
  const headerSize = 6 + entries.length * dirEntrySize
  let bmpOffset = headerSize

  const chunks = []
  const dirChunks = []

  // ICO header
  const hdr = Buffer.alloc(6)
  hdr.writeUInt16LE(0, 0) // Reserved
  hdr.writeUInt16LE(1, 2) // Type = 1 (ICO)
  hdr.writeUInt16LE(entries.length, 4) // count
  chunks.push(hdr)

  for (let i = 0; i < entries.length; i++) {
    const s = entries[i].size
    // 生成 ARGB 像素数据（从下到上，每行4字节对齐）
    const rowSize = Math.ceil((s * 4) / 4) * 4
    const pixelData = Buffer.alloc(rowSize * s)
    for (let y = 0; y < s; y++) {
      const bmpY = s - 1 - y // BMP 底部在第一行
      for (let x = 0; x < s; x++) {
        const [r, g, b, a] = rgbaFn(x, y, s)
        const idx = bmpY * rowSize + x * 4
        pixelData[idx] = b
        pixelData[idx + 1] = g
        pixelData[idx + 2] = r
        pixelData[idx + 3] = a
      }
    }
    // AND mask（透明度掩码，1bit/pixel，每 row 对齐到 4 字节）
    const andRowBytes = Math.ceil(s / 8 / 4) * 4
    const andMask = Buffer.alloc(andRowBytes * s, 0x00) // 0=可见

    // BITMAPINFOHEADER (40 bytes). 注意 ICO 用 height = s * 2 (AND mask)
    const bihSize = 40
    const bih = Buffer.alloc(bihSize)
    bih.writeUInt32LE(bihSize, 0) // biSize
    bih.writeInt32LE(s, 4) // biWidth
    bih.writeInt32LE(s * 2, 8) // biHeight (XOR + AND)
    bih.writeUInt16LE(1, 12) // biPlanes
    bih.writeUInt16LE(32, 14) // biBitCount = 32bpp ARGB
    bih.writeUInt32LE(0, 16) // biCompression = BI_RGB
    bih.writeUInt32LE(pixelData.length + andMask.length, 20) // biSizeImage
    bih.writeInt32LE(0, 24) // biXPelsPerMeter
    bih.writeInt32LE(0, 28) // biYPelsPerMeter
    bih.writeUInt32LE(0, 32) // biClrUsed
    bih.writeUInt32LE(0, 36) // biClrImportant

    const bmp = Buffer.concat([bih, pixelData, andMask])
    const size = bmp.length

    // Directory entry
    const dir = Buffer.alloc(dirEntrySize)
    dir[0] = s === 256 ? 0 : s // Width
    dir[1] = s === 256 ? 0 : s // Height
    dir[2] = 0 // Color count
    dir[3] = 0 // Reserved
    dir.writeUInt16LE(1, 4) // Color planes
    dir.writeUInt16LE(32, 6) // Bits per pixel
    dir.writeUInt32LE(size, 8) // Size of BMP data
    dir.writeUInt32LE(bmpOffset, 12) // Offset
    dirChunks.push(dir)

    chunks.push(bmp)
    bmpOffset += size
  }

  // 拼接头部 + 目录 + 数据
  const result = Buffer.concat([chunks[0], ...dirChunks, ...chunks.slice(1)])
  const dir = path.dirname(outPath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(outPath, result)
  console.log('Wrote', outPath, result.length, 'bytes')
  void zlib
}

// 简单颜色方案：app 图标 蓝底，MD 图标 白底
function appIconRGBA(x, y, s) {
  // 背景渐变蓝色
  const t = (x + y) / (2 * s)
  const r = Math.round(20 + 20 * t)
  const g = Math.round(80 + 40 * t)
  const b = Math.round(200 - 20 * t)
  // 画一个简单的 "M" 形 白色 3px
  const pad = Math.max(2, Math.floor(s * 0.15))
  const inside = x >= pad && x < s - pad && y >= pad && y < s - pad
  const mRegion = drawM(x, y, s, pad)
  if (mRegion) {
    return [255, 255, 255, 255]
  }
  if (inside) {
    return [r, g, b, 255]
  }
  return [r, g, b, 200]
}

function mdIconRGBA(x, y, s) {
  const pad = Math.max(2, Math.floor(s * 0.1))
  // 外框
  const border = x < pad || x >= s - pad || y < pad || y >= s - pad
  const hashes = drawMarkdown(x, y, s, pad)
  if (hashes) {
    return [50, 120, 200, 255]
  }
  if (border) {
    return [50, 120, 200, 255]
  }
  return [255, 255, 255, 255]
}

function drawM(x, y, s, pad) {
  const w = s - pad * 2
  const h = s - pad * 2
  const xx = x - pad
  const yy = y - pad
  // 简单的 "M"：左右竖线 + 两条斜线
  const stroke = Math.max(1, Math.floor(w / 14))
  const leftBar = xx < stroke
  const rightBar = xx >= w - stroke
  // 顶部到底部的 V：两条直线
  const mid = Math.floor(w / 2)
  // 斜线 1: 从 (stroke, 0) -> (mid, h*0.7)
  const rise = h * 0.7
  const run = mid - stroke
  const line1 = Math.abs((yy) * (run) - (xx - stroke) * (rise)) < stroke * 2 && xx >= stroke && xx <= mid
  const line2 = Math.abs((yy) * (run) - (w - stroke - xx) * (rise)) < stroke * 2 && xx >= mid && xx <= w - stroke
  const topBar = yy < stroke * 2 && xx >= stroke && xx <= w - stroke
  return leftBar || rightBar || line1 || line2 || topBar
}

function drawMarkdown(x, y, s, pad) {
  // 画 3 个 "#"，简化为水平的 3 条双竖线+双横线
  const w = s - pad * 2
  const h = s - pad * 2
  const xx = x - pad
  const yy = y - pad
  const unit = Math.max(1, Math.floor(w / 16))
  // 3 个区块 x 位置
  const blocks = [
    Math.floor(w * 0.12),
    Math.floor(w * 0.44),
    Math.floor(w * 0.76)
  ]
  for (const bx of blocks) {
    // 两条竖线
    if ((xx >= bx && xx < bx + unit) || (xx >= bx + unit * 2 && xx < bx + unit * 3)) {
      if (yy >= unit * 2 && yy < h - unit * 2) return true
    }
    // 两条横线
    if ((yy >= unit * 3 && yy < unit * 4) || (yy >= h - unit * 4 && yy < h - unit * 3)) {
      if (xx >= bx && xx < bx + unit * 3) return true
    }
  }
  return false
}

const outDir = path.join(__dirname, '..', 'resources')
makeIco([16, 32, 48, 64], appIconRGBA, path.join(outDir, 'icon.ico'))
makeIco([16, 32, 48, 64], mdIconRGBA, path.join(outDir, 'md-icon.ico'))
