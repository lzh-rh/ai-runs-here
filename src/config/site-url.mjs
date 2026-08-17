const developmentSiteUrl = 'http://localhost:4321';
const invalidMessage =
  'PUBLIC_SITE_URL must be a valid absolute HTTP(S) origin without credentials, a path, query parameters, or a fragment.';

export function resolveSiteUrl(value, { production = false } = {}) {
  if (!value?.trim()) {
    if (production) {
      throw new Error('PUBLIC_SITE_URL is required for production builds. Set it to the public site origin.');
    }
    return developmentSiteUrl;
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(invalidMessage);
  }

  const isHttp = url.protocol === 'http:' || url.protocol === 'https:';
  const isOriginOnly =
    !url.username &&
    !url.password &&
    url.pathname === '/' &&
    !url.search &&
    !url.hash;

  if (!isHttp || !isOriginOnly) throw new Error(invalidMessage);
  if (production && url.hostname.toLowerCase() === 'localhost') {
    throw new Error('PUBLIC_SITE_URL localhost is only available during development.');
  }
  return url.origin;
}

export function resolveBasePath(value) {
  const raw = value?.trim() || '/';
  if (raw.includes('?') || raw.includes('#') || raw.includes('..') || raw.startsWith('//')) {
    throw new Error('PUBLIC_BASE_PATH must be a root-relative GitHub Pages base path.');
  }
  const segment = raw.replace(/^\/+|\/+$/g, '');
  return segment ? `/${segment}/` : '/';
}

export function isProductionBuild(argv = process.argv) {
  return argv.includes('build');
}
