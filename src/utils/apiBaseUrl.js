/**
 * Resolve interpreter portal API base URL.
 *
 * Hostname mapping takes precedence over REACT_APP_API_URL so a sandbox deploy
 * built with prod env vars still talks to sandbox-backend when served from
 * sandbox-providers.theintegritycompanyinc.com.
 */
const HOSTNAME_API_MAP = {
  'sandbox-providers.theintegritycompanyinc.com':
    'https://sandbox-backend.theintegritycompanyinc.com/api',
  'providers.theintegritycompanyinc.com':
    'https://backend.theintegritycompanyinc.com/api',
};

export function getApiBaseUrl() {
  if (typeof window !== 'undefined') {
    const mapped = HOSTNAME_API_MAP[window.location.hostname];
    if (mapped) return mapped;
  }

  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  return typeof window !== 'undefined'
    ? '/api'
    : 'http://localhost:3001/api';
}

export default getApiBaseUrl;
