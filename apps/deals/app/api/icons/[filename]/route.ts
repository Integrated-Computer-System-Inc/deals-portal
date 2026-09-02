import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Known MIME mappings
const EXT_MIME: Record<string, string> = {
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

// Memory cache to serve assets with 0ms latency and avoid repeated fs calls
interface CachedAsset {
  buffer: Buffer;
  contentType: string;
  fileSize: number;
  etag: string;
}

const memoryCache = new Map<string, CachedAsset>();

function getAsset(filename: string): CachedAsset | null {
  const cleanName = filename.split('?')[0].trim();
  if (!cleanName || cleanName.includes('..')) {
    return null;
  }

  const cached = memoryCache.get(cleanName);
  if (cached) {
    return cached;
  }

  const searchDirs = [
    path.join(process.cwd(), 'icons'),
    path.join('c:\\Users\\bcandelaria\\dev\\icons'),
    path.join(process.cwd(), 'public', 'icons'),
    path.join(process.cwd(), 'apps', 'deals', 'public', 'icons'),
  ];

  let resolvedPath = '';
  for (const d of searchDirs) {
    const p = path.join(d, cleanName);
    if (fs.existsSync(p)) {
      resolvedPath = p;
      break;
    }
  }

  if (!resolvedPath) {
    return null;
  }

  try {
    const buffer = fs.readFileSync(resolvedPath);
    const ext = path.extname(resolvedPath).toLowerCase();
    let contentType = EXT_MIME[ext] || 'application/octet-stream';

    // Verify format for webm/png
    if (ext === '.webm' && buffer.length >= 4 && buffer[0] === 0x1a && buffer[1] === 0x45) {
      contentType = 'video/webm';
    } else if (ext === '.png' && buffer.length >= 4 && buffer[0] === 0x89 && buffer[1] === 0x50) {
      contentType = 'image/png';
    }

    const stat = fs.statSync(resolvedPath);
    const etag = `"${stat.size}-${stat.mtimeMs}"`;

    const item: CachedAsset = {
      buffer,
      contentType,
      fileSize: stat.size,
      etag,
    };

    memoryCache.set(cleanName, item);
    return item;
  } catch {
    return null;
  }
}

export async function HEAD(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  const asset = getAsset(params.filename);
  if (!asset) {
    return new NextResponse('File Not Found', { status: 404 });
  }

  return new NextResponse(null, {
    status: 200,
    headers: {
      'Content-Type': asset.contentType,
      'Content-Length': asset.fileSize.toString(),
      'Accept-Ranges': 'bytes',
      'ETag': asset.etag,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  const asset = getAsset(params.filename);
  if (!asset) {
    return new NextResponse('File Not Found', { status: 404 });
  }

  const { buffer, contentType, fileSize, etag } = asset;

  // Check 304 Not Modified
  const ifNoneMatch = request.headers.get('if-none-match');
  if (ifNoneMatch && ifNoneMatch === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        'ETag': etag,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }

  // Handle Range Requests for Videos via fast in-memory buffer slice
  const range = request.headers.get('range');
  if (range && contentType.startsWith('video/')) {
    const rangeHeader = range.replace(/bytes=/, '');
    const parts = rangeHeader.split('-');
    const start = Math.max(0, parseInt(parts[0], 10) || 0);
    const end = parts[1] ? Math.min(fileSize - 1, parseInt(parts[1], 10)) : fileSize - 1;
    const chunkSize = Math.max(0, end - start + 1);

    const sliced = new Uint8Array(buffer.subarray(start, end + 1));

    return new NextResponse(sliced, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize.toString(),
        'Content-Type': contentType,
        'ETag': etag,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Length': fileSize.toString(),
      'Accept-Ranges': 'bytes',
      'ETag': etag,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
