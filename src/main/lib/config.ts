import { app } from 'electron'
import { join } from 'path'
import { readFile, writeFile, fileExists } from './fileSystem'
import logger from './logger'
import type { AppConfig } from '@shared/types/config'
import { DEFAULT_CONFIG } from '@shared/types/config'

const CONFIG_FILENAME = 'config.json'

type AnyObj = Record<string, unknown>

/**
 * 深度合并两个对象（用于补充默认值）
 */
export function deepMerge<T>(target: T, source: Partial<T>): T {
  const output: AnyObj = { ...(target as unknown as AnyObj) }
  const src: AnyObj = { ...(source as unknown as AnyObj) }
  for (const key of Object.keys(src)) {
    const sourceVal = src[key]
    const targetVal = output[key]
    if (
      sourceVal !== null &&
      typeof sourceVal === 'object' &&
      !Array.isArray(sourceVal) &&
      targetVal !== null &&
      typeof targetVal === 'object' &&
      !Array.isArray(targetVal)
    ) {
      output[key] = deepMerge(targetVal, sourceVal)
    } else {
      output[key] = sourceVal
    }
  }
  return output as unknown as T
}

function getConfigPath(): string {
  return join(app.getPath('userData'), CONFIG_FILENAME)
}

/**
 * 读取配置，缺失字段用 DEFAULT_CONFIG 补充
 */
export async function readConfig(): Promise<AppConfig> {
  const configPath = getConfigPath()
  const exists = await fileExists(configPath)
  if (!exists) {
    logger.info('Config not found, using DEFAULT_CONFIG')
    return deepMerge({} as AppConfig, DEFAULT_CONFIG)
  }

  try {
    const raw = await readFile(configPath)
    const parsed = JSON.parse(raw) as Partial<AppConfig>
    const merged = deepMerge(DEFAULT_CONFIG, parsed)
    logger.debug('Config loaded and merged')
    return merged
  } catch (e) {
    logger.error('Config parse failed, fallback to DEFAULT_CONFIG', e)
    return deepMerge({} as AppConfig, DEFAULT_CONFIG)
  }
}

/**
 * 写入配置（原子写入）
 */
export async function writeConfig(config: AppConfig): Promise<void> {
  const configPath = getConfigPath()
  const content = JSON.stringify(config, null, 2)
  await writeFile(configPath, content)
  logger.debug('Config written')
}
