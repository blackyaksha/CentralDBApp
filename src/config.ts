export const FLOW_ENDPOINT = import.meta.env.VITE_FLOW_URL ?? ''
export const CLIENT_PASSWORD = import.meta.env.VITE_APP_PASSWORD ?? ''
export const ADMIN_USER = import.meta.env.VITE_ADMIN_USERNAME ?? ''
export const ADMIN_PASS = import.meta.env.VITE_ADMIN_PASSWORD ?? ''

export function getMissingEnvWarning(): string | null {
  const missing: string[] = []
  if (!FLOW_ENDPOINT) missing.push('VITE_FLOW_URL')
  if (!CLIENT_PASSWORD) missing.push('VITE_APP_PASSWORD')
  if (!ADMIN_USER) missing.push('VITE_ADMIN_USERNAME')
  if (!ADMIN_PASS) missing.push('VITE_ADMIN_PASSWORD')
  return missing.length > 0 ? `Missing env variables: ${missing.join(', ')}` : null
}
