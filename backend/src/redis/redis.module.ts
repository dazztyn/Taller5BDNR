import { Module } from '@nestjs/common';
import { Redis } from 'ioredis';
import { RedisService } from './redis.service';

@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: () => {
        if (process.env.REDIS_URL) {
          return new Redis(process.env.REDIS_URL);
        }

        return new Redis({
          host: 'localhost', 
          port: 6379,
        });
      },
    },
    RedisService,
  ],
  exports: [RedisService], 
})
export class RedisModule {}