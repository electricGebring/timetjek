export type RetryOptions = {
  maxRetries?: number
  initialDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  retryableErrors?: string[]
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  retryableErrors: ['NetworkError', 'TimeoutError', 'ECONNRESET', 'ETIMEDOUT']
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  let lastError: Error | unknown

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn()
    }
      catch (error: unknown) {
      lastError = error

      // Don't retry on last attempt
      if (attempt === opts.maxRetries) {
        break
      }

      // Check if error is retryable
      const hasMessage = (e: unknown): e is { message: string } =>
        typeof e === 'object' && e !== null && 'message' in e && 
      typeof (e as { message: unknown }).message === 'string';

      const errorMessage = hasMessage(error) ? error.message : ''

      const isRetryable = opts.retryableErrors.some((retryableError) =>
        errorMessage.includes(retryableError)
      )

      if (!isRetryable) {
        // Not a retryable error, throw immediately
        throw error
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(opts.initialDelay * Math.pow(opts.backoffMultiplier, attempt), opts.maxDelay)

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  const errorObj = error as { message?: string; status?: number }

  const errorMessage = errorObj.message || ''

  const status = errorObj.status

  // Network errors are retryable
  if (errorMessage.includes('NetworkError') || errorMessage.includes('Failed to fetch')) {
    return true
  }

  // 5xx server errors are retryable
  if (status !== undefined && status >= 500 && status < 600) {
    return true
  }

  // 429 Too Many Requests is retryable
  if (status === 429) {
    return true
  }

  // Timeout errors are retryable
  if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
    return true
  }

  return false
}
