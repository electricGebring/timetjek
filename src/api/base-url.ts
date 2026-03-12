const DEFAULT_API_PORT = '3002'

function trimTrailingSlashes(url: string): string {
  return url.replace(/\/+$/, '')
}

/**
 * Resolve API base URL across web + native (Capacitor).
 * Native uses `capacitor://` origin, so we must force http(s) for network calls.
 */
export function resolveApiBaseUrl(): string {
  const envBaseUrl =
    (typeof import.meta !== 'undefined' &&
      (import.meta as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL) ||
    undefined

  if (typeof envBaseUrl === 'string' && envBaseUrl.trim().length > 0) {
    return trimTrailingSlashes(envBaseUrl.trim())
  }

  if (typeof window !== 'undefined' && window.location) {
    const { protocol, hostname } = window.location

    if (protocol === 'http:' || protocol === 'https:') {
      return `${protocol}//${hostname}:${DEFAULT_API_PORT}`
    }

    if (hostname) {
      return `http://${hostname}:${DEFAULT_API_PORT}`
    }
  }

  return `http://localhost:${DEFAULT_API_PORT}`
}
