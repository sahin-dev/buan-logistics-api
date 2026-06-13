import { Global, Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { CacheService } from '../services/cache.service';

@Global()
@Module({
  imports: [
    NestCacheModule.register({
      isGlobal: true,
      socket: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
      auth_pass: process.env.REDIS_PASSWORD,
      ttl: 15 * 60, // Default 15 minutes in seconds
    }),
  ],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModuleConfig {}
