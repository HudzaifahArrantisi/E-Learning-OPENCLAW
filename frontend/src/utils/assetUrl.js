import { getBackendBaseUrl } from './backendUrl'

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0'])

const BACKEND_BASE_URL = getBackendBaseUrl()

const getBackendOrigin = () => {
  try {
    return new URL(BACKEND_BASE_URL).origin
  } catch {
    return window.location.origin
  }
}

export const resolveBackendAssetUrl = (input) => {
  if (!input || typeof input !== 'string') return null

  const raw = input.trim()
  if (!raw) return null

  if (raw.startsWith('data:') || raw.startsWith('blob:')) {
    return raw
  }

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      const parsed = new URL(raw)
      if (LOCAL_HOSTS.has(parsed.hostname)) {
        return `${getBackendOrigin()}${parsed.pathname}${parsed.search}${parsed.hash}`
      }
      return raw
    } catch (error) {
      return raw
    }
  }

  const normalizedPath = raw.startsWith('/') ? raw : `/${raw}`
  return `${BACKEND_BASE_URL}${normalizedPath}`
}
