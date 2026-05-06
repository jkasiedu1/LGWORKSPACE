import { AwsClient } from 'aws4fetch';

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic',
]);

const ALLOWED_VIDEO_TYPES = new Set([
  'video/mp4', 'video/quicktime', 'video/webm', 'video/mov',
]);

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;  // 10 MB
const MAX_VIDEO_BYTES = 200 * 1024 * 1024; // 200 MB

function sanitize(name) {
  return String(name || 'upload').replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').slice(0, 120);
}

function cors(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

function json(body, status = 200, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors(origin) },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '*';
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors(origin) });
    }

    // POST /sign-upload — generate signed R2 PUT URL
    if (request.method === 'POST' && url.pathname === '/sign-upload') {
      try {
        const { fileName, fileType, fileSize, folder = 'community' } = await request.json();

        if (!fileName || !fileType) {
          return json({ error: 'fileName and fileType are required' }, 400, origin);
        }

        const isVideo = ALLOWED_VIDEO_TYPES.has(fileType);
        const isImage = ALLOWED_IMAGE_TYPES.has(fileType);

        if (!isImage && !isVideo) {
          return json({ error: `File type ${fileType} is not allowed.` }, 415, origin);
        }

        if (fileSize && isImage && fileSize > MAX_IMAGE_BYTES) {
          return json({ error: 'Image exceeds 10 MB limit.' }, 413, origin);
        }

        if (fileSize && isVideo && fileSize > MAX_VIDEO_BYTES) {
          return json({ error: 'Video exceeds 200 MB limit.' }, 413, origin);
        }

        const key = `${folder}/${Date.now()}-${sanitize(fileName)}`;
        const endpoint = `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_BUCKET}/${key}`;

        const aws = new AwsClient({
          accessKeyId: env.R2_ACCESS_KEY_ID,
          secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        });

        const signedReq = await aws.sign(
          new Request(endpoint, {
            method: 'PUT',
            headers: { 'Content-Type': fileType },
          }),
          { aws: { service: 's3', region: 'auto' }, signQuery: true }
        );

        const fileUrl = `${url.origin}/media/${encodeURIComponent(key)}`;

        return json({ uploadUrl: signedReq.url, fileUrl, key }, 200, origin);
      } catch (err) {
        console.error('[sign-upload]', err);
        return json({ error: String(err?.message || err) }, 500, origin);
      }
    }

    // GET /media/:key — serve file from R2
    if (request.method === 'GET' && url.pathname.startsWith('/media/')) {
      try {
        const key = decodeURIComponent(url.pathname.replace('/media/', ''));
        const object = await env.MEDIA_BUCKET.get(key);

        if (!object) {
          return new Response('Not found', { status: 404, headers: cors(origin) });
        }

        const headers = new Headers(cors(origin));
        if (object.httpMetadata?.contentType) {
          headers.set('Content-Type', object.httpMetadata.contentType);
        }
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');

        return new Response(object.body, { status: 200, headers });
      } catch (err) {
        console.error('[media-serve]', err);
        return json({ error: String(err?.message || err) }, 500, origin);
      }
    }

    return json({ error: 'Not found' }, 404, origin);
  },
};
