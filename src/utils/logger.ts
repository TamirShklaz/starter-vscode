import type { ExtensionContext, OutputChannel } from 'vscode'
import { window } from 'vscode'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface Logger {
  debug: (message: string, data?: unknown) => void
  info: (message: string, data?: unknown) => void
  warn: (message: string, data?: unknown) => void
  error: (message: string, data?: unknown) => void
  show: () => void
}

let channel: OutputChannel | undefined
let currentLevel: LogLevel = 'debug'

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

function formatMessage(level: LogLevel, message: string, data?: unknown): string {
  const timestamp = new Date().toISOString()
  const levelStr = level.toUpperCase().padEnd(5)
  const dataStr = data !== undefined ? ` ${JSON.stringify(data)}` : ''
  return `[${timestamp}] [${levelStr}] ${message}${dataStr}`
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel]
}

/**
 * Logger instance with methods for each log level.
 */
export const log: Logger = {
  debug: (message: string, data?: unknown) => {
    if (shouldLog('debug') && channel) {
      channel.appendLine(formatMessage('debug', message, data))
    }
  },

  info: (message: string, data?: unknown) => {
    if (shouldLog('info') && channel) {
      channel.appendLine(formatMessage('info', message, data))
    }
  },

  warn: (message: string, data?: unknown) => {
    if (shouldLog('warn') && channel) {
      channel.appendLine(formatMessage('warn', message, data))
    }
  },

  error: (message: string, data?: unknown) => {
    if (shouldLog('error') && channel) {
      channel.appendLine(formatMessage('error', message, data))
    }
  },

  show: () => {
    channel?.show()
  },
}

/**
 * Initialize the logger. Call this in your extension's activate function.
 */
export function initLogger(context: ExtensionContext, name = 'Nota'): Logger {
  channel = window.createOutputChannel(name)
  context.subscriptions.push(channel)

  log.info('Logger initialized')

  return log
}

/**
 * Set the minimum log level.
 */
export function setLogLevel(level: LogLevel): void {
  currentLevel = level
}
