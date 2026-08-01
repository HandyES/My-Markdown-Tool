import { ipcMain } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import logger from '../lib/logger'
import { mkdirp } from '../lib/fileSystem'
import { readConfig } from '../lib/config'

/**
 * 根据命名模式生成文件名
 */
function formatName(pattern: string, now: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  const YYYY = String(now.getFullYear())
  const MM = pad(now.getMonth() + 1)
  const DD = pad(now.getDate())
  const HH = pad(now.getHours())
  const mm = pad(now.getMinutes())
  const ss = pad(now.getSeconds())
  return pattern
    .replace('YYYY', YYYY)
    .replace('MM', MM)
    .replace('DD', DD)
    .replace('HH', HH)
    .replace('mm', mm)
    .replace('ss', ss)
}

/**
 * 若同名存在，追加 -1 -2 ...
 */
function resolveUnique(dir: string, base: string, ext: string): string {
  let candidate = path.join(dir, `${base}.${ext}`)
  let i = 1
  while (fs.existsSync(candidate)) {
    candidate = path.join(dir, `${base}-${i}.${ext}`)
    i += 1
  }
  return candidate
}

export function registerImageIpcHandlers(): void {
  ipcMain.handle(
    'invoke:image-localize',
    async (
      _event,
      imageData: ArrayBuffer,
      docPath: string,
      ext = 'png'
    ): Promise<string> => {
      const cfg = await readConfig()
      const dir = path.join(path.dirname(docPath), cfg.image.directory || 'assets')
      await mkdirp(dir)
      const pattern = cfg.image.namingPattern || 'image-YYYYMMDD-HHmmss'
      const base = formatName(pattern, new Date())
      const finalPath = resolveUnique(dir, base, ext)
      await fs.promises.writeFile(finalPath, Buffer.from(imageData))
      logger.info('image localized:', finalPath)

      // 返回相对路径（相对于 docPath）
      const relative = path.relative(path.dirname(docPath), finalPath)
      return relative.replace(/\\/g, '/')
    }
  )
}
