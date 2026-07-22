import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { AppConfig } from '../config/configuration';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private enabled = false;

  constructor(private readonly configService: ConfigService<{ app: AppConfig }, true>) {}

  async onModuleInit(): Promise<void> {
    const redisUrl = this.configService.get('app', { infer: true }).redisUrl;
    if (!redisUrl) {
      return;
    }

    const client = new Redis(redisUrl, {
      lazyConnect: true,
      enableReadyCheck: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 1000,
      retryStrategy: () => null,
    });

    client.on('error', (err: Error) => {
      if (!this.enabled) return;
      this.handleRuntimeFailure(`Redis connection error: ${err.message}`);
    });
    client.on('end', () => {
      if (!this.enabled) return;
      this.handleRuntimeFailure('Redis connection closed, falling back to postgres-only mode');
    });

    try {
      await client.connect();
      this.client = client;
      this.enabled = true;
      this.logger.log('Redis connected');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Redis unavailable at startup (${message}); continuing with postgres-fallback mode`);
      client.disconnect(false);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit();
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.enabled || !this.client) return null;
    try {
      return await this.client.get(key);
    } catch (error) {
      this.handleRuntimeFailure(this.describeRuntimeFailure('GET', key, error));
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (!this.enabled || !this.client) return;
    try {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } catch (error) {
      this.handleRuntimeFailure(this.describeRuntimeFailure('SET', key, error));
    }
  }

  async del(key: string): Promise<void> {
    if (!this.enabled || !this.client) return;
    try {
      await this.client.del(key);
    } catch (error) {
      this.handleRuntimeFailure(this.describeRuntimeFailure('DEL', key, error));
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private describeRuntimeFailure(operation: 'GET' | 'SET' | 'DEL', key: string, error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    return `Redis ${operation} failed for ${key}: ${message}`;
  }

  private handleRuntimeFailure(message: string): void {
    this.logger.warn(`${message}; continuing with postgres-fallback mode`);
    this.enabled = false;
    if (this.client) {
      this.client.disconnect(false);
      this.client = null;
    }
  }
}
