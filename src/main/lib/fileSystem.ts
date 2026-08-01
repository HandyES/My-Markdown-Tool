import * as fs from 'fs'
import * as path from 'path'
import { promisify } from 'util'
import logger from './logger'

const fsWriteFile = promisify(fs.writeFile)
const fsReadFile = promisify(fs.readFile)
const fsMkdir = promisify(fs.mkdir)
const fsExists = promisify(fs.exists)
const fsRename = promisify(fs.rename)
const fsStat = promisify(fs.stat)

/**
 * 读取文件内容（UTF-8）
 */
export async function readFile(filePath: string): Promise<string> {
  const buffer = await fsReadFile(filePath)
  return buffer.toString('utf8')
}

/**
 * 原子写入文件（临时文件 + rename）
 */
export async function writeFile(filePath: string, content: string | Buffer): Promise<void> {
  const dir = path.dirname(filePath)
  if (!(await fsExists(dir))) {
    await fsMkdir(dir, { recursive: true })
  }

  const tmpPath = `${filePath}.tmp.${Date.now()}`
  try {
    await fsWriteFile(tmpPath, content)
    await fsRename(tmpPath, filePath)
    logger.debug(`File written atomically: ${filePath}`)
  } catch (e) {
    logger.error(`Write file failed: ${filePath}`, e)
    // 清理临时文件
    try {
      if (await fsExists(tmpPath)) await fs.promises.unlink(tmpPath)
    } catch {
      // ignore
    }
    throw e
  }
}

/**
 * 判断文件是否存在
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stat = await fsStat(filePath)
    return stat.isFile()
  } catch {
    return false
  }
}

/**
 * 判断目录是否存在
 */
export async function dirExists(dirPath: string): Promise<boolean> {
  try {
    const stat = await fsStat(dirPath)
    return stat.isDirectory()
  } catch {
    return false
  }
}

/**
 * 递归创建目录
 */
export async function mkdirp(dirPath: string): Promise<void> {
  await fsMkdir(dirPath, { recursive: true })
}

/**
 * 写入二进制文件（原子）
 */
export async function writeBinary(filePath: string, data: ArrayBuffer): Promise<void> {
  await writeFile(filePath, Buffer.from(data))
}
