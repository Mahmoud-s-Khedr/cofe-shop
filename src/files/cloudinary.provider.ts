import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { AppConfig } from '../config/configuration';

export const CLOUDINARY = Symbol('CLOUDINARY');

export const cloudinaryProvider: Provider = {
  provide: CLOUDINARY,
  inject: [ConfigService],
  useFactory: (configService: ConfigService<{ app: AppConfig }, true>) => {
    const appConfig = configService.get('app', { infer: true });
    cloudinary.config({
      cloud_name: appConfig.cloudinaryCloudName,
      api_key: appConfig.cloudinaryApiKey,
      api_secret: appConfig.cloudinaryApiSecret,
      secure: true,
    });
    return cloudinary;
  },
};

export type CloudinaryInstance = typeof cloudinary;
