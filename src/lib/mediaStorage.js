import { auth } from '../config/firebase';

const R2_SIGNER_URL = import.meta.env.VITE_R2_SIGNER_URL;
const R2_UPLOAD_MAX_IMAGE_MB = Number(import.meta.env.VITE_R2_MAX_IMAGE_MB || 10);
const R2_UPLOAD_MAX_VIDEO_MB = Number(import.meta.env.VITE_R2_MAX_VIDEO_MB || 100);

function toMb(bytes) {
  return bytes / (1024 * 1024);
}

function sanitizeFileName(fileName) {
  return String(fileName || 'upload.bin')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120);
}

function validateMediaFile(file) {
  const isVideo = file?.type?.startsWith('video/');
  const sizeMb = toMb(file?.size || 0);

  if (isVideo && sizeMb > R2_UPLOAD_MAX_VIDEO_MB) {
    throw new Error(`Video is too large. Max ${R2_UPLOAD_MAX_VIDEO_MB}MB.`);
  }

  if (!isVideo && sizeMb > R2_UPLOAD_MAX_IMAGE_MB) {
    throw new Error(`Image is too large. Max ${R2_UPLOAD_MAX_IMAGE_MB}MB.`);
  }
}

async function getAuthToken() {
  const currentUser = auth?.currentUser;
  if (!currentUser) return null;
  return currentUser.getIdToken();
}

async function requestUploadSignature(file, folder = 'community') {
  if (!R2_SIGNER_URL) {
    throw new Error('Cloudflare R2 is not configured. Set VITE_R2_SIGNER_URL.');
  }

  const token = await getAuthToken();
  const response = await fetch(R2_SIGNER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      fileName: sanitizeFileName(file.name),
      fileType: file.type || 'application/octet-stream',
      folder,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Failed to request upload URL (${response.status}): ${details}`);
  }

  return response.json();
}

export async function uploadMediaToR2(file, folder = 'community') {
  validateMediaFile(file);

  const signedUpload = await requestUploadSignature(file, folder);
  const { uploadUrl, fileUrl, headers = {} } = signedUpload;

  if (!uploadUrl || !fileUrl) {
    throw new Error('Invalid R2 upload signature response.');
  }

  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
      ...headers,
    },
    body: file,
  });

  if (!uploadResponse.ok) {
    const details = await uploadResponse.text();
    throw new Error(`R2 upload failed (${uploadResponse.status}): ${details}`);
  }

  return {
    mediaUrl: fileUrl,
    mediaType: file.type?.startsWith('video/') ? 'video' : 'image',
    mediaName: file.name,
    mediaSizeBytes: file.size,
    mediaMimeType: file.type,
  };
}
