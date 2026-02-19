/**
 * Central logging: create a logger with an optional prefix for consistent, filterable output.
 * Default backend is console; can be overridden for tests or other environments.
 */

export type Logger = Pick<Console, 'log' | 'warn' | 'error'>

const defaultBackend: Logger = console

function formatMessage(prefix: string, args: unknown[]): unknown[] {
  if (!prefix) return args

  const tag = `[${prefix}]`

  if (args.length === 0) return [tag]

  if (typeof args[0] === 'string') return [`${tag} ${args[0]}`, ...args.slice(1)]

  return [tag, ...args]
}

/**
 * Create a logger that prefixes all messages with [prefix].
 * Uses the global backend (console by default); set setLoggerBackend() in tests to override.
 */
export function createLogger(prefix: string): Logger {
  return {
    log: (...args: unknown[]) => backend.log(...formatMessage(prefix, args)),
    warn: (...args: unknown[]) => backend.warn(...formatMessage(prefix, args)),
    error: (...args: unknown[]) => backend.error(...formatMessage(prefix, args))
  }
}

let backend: Logger = defaultBackend

/**
 * Override the logger backend (e.g. in tests). Pass undefined to reset to console.
 */
export function setLoggerBackend(b?: Logger): void {
  backend = b ?? defaultBackend
}
