import { readFile, stat } from 'node:fs/promises';
import { extname, isAbsolute, join, relative, resolve } from 'node:path';

const publicRoot = resolve(process.cwd(), 'public');
const contentTypes: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

export async function GET(
  request: Request,
  { params }: { params: { slug?: string[] } }
) {
  const requestedPath = resolve(publicRoot, ...(params.slug ?? []));
  const relativePath = relative(publicRoot, requestedPath);
  if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
    return new Response('Not found', { status: 404 });
  }

  let file = requestedPath;
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    await stat(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    if (extname(requestedPath)) return new Response('Not found', { status: 404 });
    file = join(publicRoot, 'index.html');
  }

  try {
    const body = await readFile(file);
    return new Response(new Uint8Array(body), {
      headers: {
        'Content-Type': contentTypes[extname(file)] ?? 'application/octet-stream',
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    return new Response('Not found', { status: 404 });
  }
}

export async function HEAD(request: Request, context: { params: { slug?: string[] } }) {
  const response = await GET(request, context);
  return new Response(null, {
    status: response.status,
    headers: response.headers,
  });
}
