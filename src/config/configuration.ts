export type AppConfig = {
  nodeEnv: string;
  port: number;
  corsOrigins: string[];
  databaseUrl: string;
  databaseSsl: boolean;
  databasePoolMax: number;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  jwtAccessTtl: string;
  jwtRefreshTtl: string;
  adminPhone?: string;
  adminPassword?: string;
  otpSigningSecret: string;
  otpTtlMinutes: number;
  otpDevMode: boolean;
  cloudinaryCloudName: string;
  cloudinaryApiKey: string;
  cloudinaryApiSecret: string;
  throttleTtl: number;
  throttleLimit: number;
  throttleDevBypass: boolean;
  logLevel: string;
  logPretty: boolean;
  logHttpBody: boolean;
  logWsPayload: boolean;
  redisUrl?: string;
};

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback;
  return value.toLowerCase() === 'true';
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = parseNumber(value, fallback);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export default (): AppConfig => {
  const databaseUrl = process.env.DATABASE_URL;
  const jwtAccessSecret = process.env.JWT_ACCESS_SECRET;
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
  const otpSigningSecret = process.env.OTP_SIGNING_SECRET;
  const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const cloudinaryApiKey = process.env.CLOUDINARY_API_KEY;
  const cloudinaryApiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  if (!jwtAccessSecret) throw new Error('JWT_ACCESS_SECRET is required');
  if (!jwtRefreshSecret) throw new Error('JWT_REFRESH_SECRET is required');
  if (!otpSigningSecret) throw new Error('OTP_SIGNING_SECRET is required');
  if (!cloudinaryCloudName) throw new Error('CLOUDINARY_CLOUD_NAME is required');
  if (!cloudinaryApiKey) throw new Error('CLOUDINARY_API_KEY is required');
  if (!cloudinaryApiSecret) throw new Error('CLOUDINARY_API_SECRET is required');

  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: parseNumber(process.env.PORT, 3000),
    corsOrigins: (process.env.CORS_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    databaseUrl,
    databaseSsl: parseBoolean(process.env.DATABASE_SSL, false),
    databasePoolMax: parsePositiveInteger(process.env.DATABASE_POOL_MAX, 20),
    jwtAccessSecret,
    jwtRefreshSecret,
    jwtAccessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    jwtRefreshTtl: process.env.JWT_REFRESH_TTL ?? '30d',
    adminPhone: process.env.ADMIN_PHONE,
    adminPassword: process.env.ADMIN_PASSWORD,
    otpSigningSecret,
    otpTtlMinutes: parseNumber(process.env.OTP_TTL_MINUTES, 10),
    // Dev-mode: no SMS provider is wired up yet, so OTP codes are returned in
    // the API response instead of being sent. Replace with a real sender when
    // one is available.
    otpDevMode: parseBoolean(process.env.OTP_DEV_MODE, true),
    cloudinaryCloudName,
    cloudinaryApiKey,
    cloudinaryApiSecret,
    throttleTtl: parseNumber(process.env.THROTTLE_TTL, 60_000),
    throttleLimit: parseNumber(process.env.THROTTLE_LIMIT, 120),
    throttleDevBypass: parseBoolean(process.env.THROTTLE_DEV_BYPASS, false),
    logLevel: process.env.LOG_LEVEL ?? 'log',
    logPretty: parseBoolean(process.env.LOG_PRETTY, false),
    logHttpBody: parseBoolean(process.env.LOG_HTTP_BODY, false),
    logWsPayload: parseBoolean(process.env.LOG_WS_PAYLOAD, false),
    redisUrl: process.env.REDIS_URL,
  };
};
