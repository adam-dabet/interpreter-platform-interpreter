import { getApiUrl } from '../runtimeEnv';

export function getApiOrigin() {
  const apiUrl = getApiUrl();
  return apiUrl.replace(/\/api\/?$/, '');
}

/** Resolve a stored upload path (e.g. uploads/...) to the backend origin. */
export function getBackendAssetUrl(fileUrl) {
  if (!fileUrl) return '';
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    return fileUrl;
  }
  const origin = getApiOrigin();
  return `${origin}${fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`}`;
}
