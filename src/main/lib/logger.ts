import log from 'electron-log'
import { app } from 'electron'
import { join } from 'path'

// 初始化日志路径
log.transports.file.level = 'info'
log.transports.file.resolvePathFn = (): string => {
  return join(app.getPath('userData'), 'logs', 'main.log')
}

log.transports.console.level = 'debug'

export default log
