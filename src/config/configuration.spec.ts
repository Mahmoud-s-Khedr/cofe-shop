import configuration from './configuration';

const ORIGINAL_ENV = process.env;

function setBaseEnv(): void {
  process.env = {
    ...ORIGINAL_ENV,
    DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/test',
    JWT_ACCESS_SECRET: 'access',
    JWT_REFRESH_SECRET: 'refresh',
    OTP_SIGNING_SECRET: 'otp-secret',
    CLOUDINARY_CLOUD_NAME: 'demo-cloud',
    CLOUDINARY_API_KEY: '123456789012345',
    CLOUDINARY_API_SECRET: 'cloudinary-secret',
  };
}

describe('configuration', () => {
  beforeEach(() => {
    setBaseEnv();
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('loads defaults', () => {
    const config = configuration();

    expect(config.cloudinaryCloudName).toBe('demo-cloud');
    expect(config.otpDevMode).toBe(true);
    expect(config.logPretty).toBe(false);
    expect(config.logHttpBody).toBe(false);
    expect(config.logWsPayload).toBe(false);
  });

  it('parses multiple CORS origins from a comma-separated env var', () => {
    process.env.CORS_ORIGINS = 'https://a.com, https://b.com';

    const config = configuration();

    expect(config.corsOrigins).toEqual(['https://a.com', 'https://b.com']);
  });

  it('requires cloudinary settings', () => {
    delete process.env.CLOUDINARY_CLOUD_NAME;

    expect(() => configuration()).toThrow('CLOUDINARY_CLOUD_NAME is required');
  });

  it('requires database url', () => {
    delete process.env.DATABASE_URL;

    expect(() => configuration()).toThrow('DATABASE_URL is required');
  });
});
