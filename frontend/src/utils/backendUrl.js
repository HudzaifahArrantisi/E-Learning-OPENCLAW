const DEV_FRONTEND_PORTS = new Set(['3000', '4173', '5173'])

const trimTrailingSlash = (value) => value.replace(/\/+$/, '')

const getFallbackBackendBaseUrl = () => {
  if (typeof window === 'undefined') {
    return 'http://localhost:8080'
  }

  const { protocol, hostname, port, origin } = window.location

  if (DEV_FRONTEND_PORTS.has(port)) {
    return `${protocol}//${hostname}:8080`
  }

  return origin
}

export const getBackendBaseUrl = () => {
  const configuredBaseUrl = (
    import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || ''
  ).trim()

  if (configuredBaseUrl) {
    return trimTrailingSlash(configuredBaseUrl)
  }

  return trimTrailingSlash(getFallbackBackendBaseUrl())
}

export const getBackendWebSocketBaseUrl = () => {
  const backendBaseUrl = getBackendBaseUrl()

  try {
    const parsedUrl = new URL(backendBaseUrl)
    const wsProtocol = parsedUrl.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${wsProtocol}//${parsedUrl.host}`
  } catch {
    return 'ws://localhost:8080'
  }
}
