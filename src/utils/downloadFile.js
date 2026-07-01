export function getApiBaseUrl() {
  return process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
}

function guessMimeType(fileName) {
  if (!fileName) return 'application/octet-stream';
  const ext = fileName.split('.').pop()?.toLowerCase();
  const map = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
  };
  return map[ext] || 'application/octet-stream';
}

export async function openAuthenticatedFile(apiPath, fileName, tokenKey = 'interpreterToken') {
  const token = localStorage.getItem(tokenKey) || localStorage.getItem('token');
  if (!token) {
    throw new Error('You must be logged in to view this file.');
  }

  const response = await fetch(`${getApiBaseUrl()}${apiPath}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    let message = 'Failed to open file';
    try {
      const data = await response.json();
      if (data?.message) message = data.message;
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const mimeType = guessMimeType(fileName);
  const typedBlob =
    blob.type && blob.type !== 'application/octet-stream'
      ? blob
      : new Blob([blob], { type: mimeType });
  const objectUrl = URL.createObjectURL(typedBlob);
  const opened = window.open(objectUrl, '_blank', 'noopener,noreferrer');
  if (!opened) {
    URL.revokeObjectURL(objectUrl);
    throw new Error('Pop-up blocked. Please allow pop-ups to view this file.');
  }
  setTimeout(() => URL.revokeObjectURL(objectUrl), 120_000);
}

/** @deprecated Use openAuthenticatedFile — opens in a new tab for viewing. */
export async function downloadAuthenticatedFile(apiPath, fileName, tokenKey = 'interpreterToken') {
  return openAuthenticatedFile(apiPath, fileName, tokenKey);
}

export function getInterpreterCertificateFilePath(certificateId) {
  return `/interpreters/certificates/${certificateId}/file`;
}

export function getAdminCertificateFilePath(interpreterId, certificateId) {
  return `/admin/interpreters/${interpreterId}/certificates/${certificateId}/file`;
}
