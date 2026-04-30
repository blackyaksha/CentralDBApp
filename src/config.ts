export const FLOW_URL = import.meta.env.VITE_FLOW_URL
export const APP_PASSWORD = import.meta.env.VITE_APP_PASSWORD
export const ADMIN_USERNAME = import.meta.env.VITE_ADMIN_USERNAME
export const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD

function requireEnv(key: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

export const FLOW_ENDPOINT = requireEnv('VITE_FLOW_URL', FLOW_URL)
export const CLIENT_PASSWORD = requireEnv('VITE_APP_PASSWORD', APP_PASSWORD)
export const ADMIN_USER = requireEnv('VITE_ADMIN_USERNAME', ADMIN_USERNAME)
export const ADMIN_PASS = requireEnv('VITE_ADMIN_PASSWORD', ADMIN_PASSWORD)
