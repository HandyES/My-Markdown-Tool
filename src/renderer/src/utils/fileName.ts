/**
 * 按命名模式生成图片文件名
 */

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export interface GenerateFileNameOptions {
  pattern?: string // 默认 image-YYYYMMDD-HHmmss
  ext?: string // 默认 png
  exists?: (candidate: string) => boolean | Promise<boolean>
}

export function formatNamePattern(
  pattern = 'image-YYYYMMDD-HHmmss',
  now = new Date()
): string {
  const YYYY = String(now.getFullYear())
  const MM = pad2(now.getMonth() + 1)
  const DD = pad2(now.getDate())
  const HH = pad2(now.getHours())
  const mm = pad2(now.getMinutes())
  const ss = pad2(now.getSeconds())
  return pattern
    .replace('YYYY', YYYY)
    .replace('MM', MM)
    .replace('DD', DD)
    .replace('HH', HH)
    .replace('mm', mm)
    .replace('ss', ss)
}

/**
 * 生成不冲突的文件名（支持 -1 -2 追加）
 */
export async function generateUniqueFileName(
  options: GenerateFileNameOptions = {}
): Promise<string> {
  const { pattern = 'image-YYYYMMDD-HHmmss', ext = 'png', exists } = options
  let base = formatNamePattern(pattern)
  let candidate = ext ? `${base}.${ext}` : base

  if (!exists) return candidate

  let i = 1
  while (await exists(candidate)) {
    candidate = ext ? `${base}-${i}.${ext}` : `${base}-${i}`
    i += 1
    if (i > 9999) {
      // 兜底：追加随机数
      const rand = Math.random().toString(36).slice(2, 8)
      candidate = ext ? `${base}-${rand}.${ext}` : `${base}-${rand}`
      break
    }
  }
  return candidate
}
