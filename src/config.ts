export const FLOW_ENDPOINT = import.meta.env.VITE_FLOW_URL ?? ''
export const CLIENT_PASSWORD = import.meta.env.VITE_APP_PASSWORD ?? ''
export const ADMIN_USER = import.meta.env.VITE_ADMIN_USERNAME ?? ''
export const ADMIN_PASS = import.meta.env.VITE_ADMIN_PASSWORD ?? ''
export const CLIENT_USERS_RAW = import.meta.env.VITE_CLIENT_USERS ?? ''

export function parseClientUsers(raw: string): Record<string, string> {
  const result: Record<string, string> = {}
  raw.split(/[;,\n]/g)
    .map(item => item.trim())
    .filter(Boolean)
    .forEach(entry => {
      const [key, ...rest] = entry.split(':')
      const value = rest.join(':').trim()
      if (!key || !value) return
      result[key.trim().toUpperCase()] = value
    })
  return result
}

export const CLIENT_USERS = parseClientUsers(CLIENT_USERS_RAW)

export function getMissingEnvWarning(): string | null {
  const missing: string[] = []
  if (!FLOW_ENDPOINT) missing.push('VITE_FLOW_URL')
  if (!CLIENT_PASSWORD) missing.push('VITE_APP_PASSWORD')
  if (!ADMIN_USER) missing.push('VITE_ADMIN_USERNAME')
  if (!ADMIN_PASS) missing.push('VITE_ADMIN_PASSWORD')
  if (!CLIENT_USERS_RAW) missing.push('VITE_CLIENT_USERS')
  return missing.length > 0 ? `Missing env variables: ${missing.join(', ')}` : null
}
export const PINNED_DATABASE_APP_URL = import.meta.env.VITE_PINNED_DATABASE_APP_URL ?? ''
export const PINNED_SPMS_URL = import.meta.env.VITE_PINNED_SPMS_URL ?? ''
export const SP_DOMAIN = import.meta.env.VITE_SP_DOMAIN ?? ''
export const MONITORING_ROOT_FOLDER = import.meta.env.VITE_MONITORING_ROOT_FOLDER ?? ''
export const MONITORING_ROOT_PATH = import.meta.env.VITE_MONITORING_ROOT_PATH ?? ''
export const FOLDER_BANNER_URL = import.meta.env.VITE_FOLDER_BANNER_URL ?? ''