type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface Logger {
  debug: (message: string, data?: unknown) => void
  info: (message: string, data?: unknown) => void
  warn: (message: string, data?: unknown) => void
  error: (message: string, data?: unknown) => void
}

const PREFIX = '[Nota]'

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

let currentLevel: LogLevel = 'debug'

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel]
}

function formatData(data?: unknown): string {
  if (data === undefined)
    return ''
  if (typeof data === 'string')
    return data
  try {
    return JSON.stringify(data, null, 2)
  }
  catch {
    return String(data)
  }
}

/**
 * Set the minimum log level.
 */
export function setLogLevel(level: LogLevel): void {
  currentLevel = level
}

/**
 * Logger for webview - outputs to browser console.
 * View logs via: Command Palette → "Developer: Open Webview Developer Tools"
 */
export const log: Logger = {
   
  debug: (message: string, data?: unknown) => {
    if (shouldLog('debug')) {
      console.debug(`${PREFIX} ${message}`, data !== undefined ? formatData(data) : '')
    }
  },

  info: (message: string, data?: unknown) => {
    if (shouldLog('info')) {
      console.info(`${PREFIX} ${message}`, data !== undefined ? formatData(data) : '')
    }
  },
   

  warn: (message: string, data?: unknown) => {
    if (shouldLog('warn')) {
      console.warn(`${PREFIX} ${message}`, data !== undefined ? formatData(data) : '')
    }
  },

  error: (message: string, data?: unknown) => {
    if (shouldLog('error')) {
      console.error(`${PREFIX} ${message}`, data !== undefined ? formatData(data) : '')
    }
  },
}
