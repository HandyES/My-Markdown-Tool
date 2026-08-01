/**
 * 路径工具函数（处理 Windows / POSIX 分隔符差异）
 */

export function dirname(p: string): string {
  if (!p) return ''
  const normalized = p.replace(/\\/g, '/')
  const idx = normalized.lastIndexOf('/')
  if (idx < 0) return '.'
  return normalized.slice(0, idx) || '/'
}

export function basename(p: string): string {
  if (!p) return ''
  const normalized = p.replace(/\\/g, '/')
  const idx = normalized.lastIndexOf('/')
  return idx < 0 ? normalized : normalized.slice(idx + 1)
}

export function extname(p: string): string {
  const base = basename(p)
  const idx = base.lastIndexOf('.')
  return idx <= 0 ? '' : base.slice(idx)
}

export function join(...parts: string[]): string {
  if (parts.length === 0) return '.'
  let result = parts[0].replace(/\\/g, '/')
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i].replace(/\\/g, '/')
    if (result.endsWith('/')) {
      result = part.startsWith('/') ? result + part.slice(1) : result + part
    } else {
      result = part.startsWith('/') ? result + part : `${result}/${part}`
    }
  }
  return result
}

export function relative(from: string, to: string): string {
  const fromDir = (from.replace(/\\/g, '/') || '').replace(/\/+$/, '')
  const toAbs = to.replace(/\\/g, '/')
  const fromParts = fromDir.split('/').filter(Boolean)
  const toParts = toAbs.split('/').filter(Boolean)

  let common = 0
  while (
    common < fromParts.length &&
    common < toParts.length &&
    fromParts[common] === toParts[common]
  ) {
    common += 1
  }

  const up = fromParts.length - common
  const downs = toParts.slice(common)
  const result: string[] = []
  for (let i = 0; i < up; i++) result.push('..')
  result.push(...downs)
  return result.join('/') || (up > 0 ? Array(up + 1).join('..') : '.')
}
