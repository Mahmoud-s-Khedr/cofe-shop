type CorsOriginCallback = (error: Error | null, allow?: boolean) => void;

export type SharedCorsOptions = {
  origin: true | ((requestOrigin: string | undefined, callback: CorsOriginCallback) => void);
  credentials: boolean;
};

export function buildSharedCorsOptions(corsOrigins: string[]): SharedCorsOptions | null {
  if (corsOrigins.length === 0) {
    return null;
  }

  if (corsOrigins.includes('*')) {
    return {
      origin: true,
      credentials: false,
    };
  }

  return {
    origin: (requestOrigin, callback) => {
      callback(null, isAllowedOrigin(requestOrigin, corsOrigins));
    },
    credentials: true,
  };
}

export function isAllowedOrigin(requestOrigin: string | undefined, corsOrigins: string[]): boolean {
  if (!requestOrigin) {
    return true;
  }

  const requestUrl = parseOriginUrl(requestOrigin);
  if (!requestUrl) {
    return false;
  }

  return corsOrigins.some((configuredOrigin) => originsMatch(requestUrl, configuredOrigin));
}

function originsMatch(requestUrl: URL, configuredOrigin: string): boolean {
  const configuredUrl = parseOriginUrl(configuredOrigin);
  if (!configuredUrl) {
    return false;
  }

  if (requestUrl.protocol !== configuredUrl.protocol || requestUrl.port !== configuredUrl.port) {
    return false;
  }

  if (requestUrl.hostname === configuredUrl.hostname) {
    return true;
  }

  return isLocalhostAlias(requestUrl.hostname) && isLocalhostAlias(configuredUrl.hostname);
}

function isLocalhostAlias(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function parseOriginUrl(origin: string): URL | null {
  try {
    return new URL(origin);
  } catch {
    return null;
  }
}
