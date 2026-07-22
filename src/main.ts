import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFileSync } from 'node:fs';
import helmet from 'helmet';
import express from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { HttpResponseEnvelopeInterceptor } from './common/interceptors/http-response-envelope.interceptor';
import { AppConfig } from './config/configuration';
import { ErrorDetailDto, ErrorResponseDto } from './common/dto/error-response.dto';
import { buildSharedCorsOptions } from './common/helpers/cors.helpers';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get<ConfigService<{ app: AppConfig }, true>>(ConfigService);
  const appConfig = configService.get('app', { infer: true });

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(express.json({ limit: '1mb' }));
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(app.get(HttpExceptionFilter));
  app.useGlobalInterceptors(new HttpResponseEnvelopeInterceptor(), app.get(LoggingInterceptor));

  app.setGlobalPrefix('api/v1');

  const corsOptions = buildSharedCorsOptions(appConfig.corsOrigins);
  if (corsOptions) {
    app.enableCors({
      ...corsOptions,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Order-Token'],
    });
  }

  const swaggerConfig = new DocumentBuilder()
    .setTitle('BW Café Ordering API')
    .setDescription('Single-restaurant delivery/pickup ordering API — guest and registered checkout, admin order management.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig, {
    deepScanRoutes: true,
    extraModels: [ErrorResponseDto, ErrorDetailDto],
  });
  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'docs-json',
    swaggerOptions: { persistAuthorization: true },
  });
  writeFileSync('openapi.json', JSON.stringify(document, null, 2));

  await app.listen(appConfig.port);
}

void bootstrap();
