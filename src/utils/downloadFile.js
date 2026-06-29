export function getApiBaseUrl() {
  return process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
}

export async function downloadAuthenticatedFile(apiPath, fileName, tokenKey = 'interpreterToken') {
  const token = localStorage.getItem(tokenKey) || localStorage.getItem('token');
  if (!token) {
    throw new Error('You must be logged in to download this file.');
  }

  const response = await fetch(`${getApiBaseUrl()}${apiPath}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    let message = 'Failed to download file';
    try {
      const data = await response.json();
      if (data?.message) message = data.message;
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  if (fileName) {
    link.download = fileName;
  }
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

export function getInterpreterCertificateFilePath(certificateId) {
  return `/interpreters/certificates/${certificateId}/file`;
}

export function getAdminCertificateFilePath(interpreterId, certificateId) {
  return `/admin/interpreters/${interpreterId}/certificates/${certificateId}/file`;
}
