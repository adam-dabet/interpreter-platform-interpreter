function fromRuntime(name) {
  if (typeof window === 'undefined') return '';
  const value = window.__RAILWAY_ENV__?.[name];
  return typeof value === 'string' ? value.trim() : '';
}

function backendUrlForHost() {
  if (typeof window === 'undefined') return '';
  const host = window.location.hostname;
  if (host === 'sandbox-providers.theintegritycompanyinc.com') {
    return 'https://sandbox-backend.theintegritycompanyinc.com/api';
  }
  if (host === 'providers.theintegritycompanyinc.com') {
    return 'https://backend.theintegritycompanyinc.com/api';
  }
  return '';
}

export function getApiUrl() {
  return (
    fromRuntime('REACT_APP_API_URL') ||
    process.env.REACT_APP_API_URL ||
    backendUrlForHost() ||
    (process.env.NODE_ENV === 'development' ? 'http://localhost:3001/api' : '/api')
  );
}

export function getGoogleMapsApiKey() {
  return fromRuntime('REACT_APP_GOOGLE_MAPS_API_KEY') || process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
}

export function isSandboxBuild() {
  const runtime = fromRuntime('REACT_APP_SANDBOX_MODE');
  if (runtime) return runtime === 'true';
  return process.env.REACT_APP_SANDBOX_MODE === 'true';
}
