export const PORTAL_BASE_PATH = '/realtor';

export function portalPath(path: string): string {
  if (!path.startsWith('/')) {
    throw new Error('Portal paths must start with "/".');
  }

  if (path === PORTAL_BASE_PATH || path.startsWith(`${PORTAL_BASE_PATH}/`)) {
    return path;
  }

  return `${PORTAL_BASE_PATH}${path === '/' ? '' : path}`;
}
