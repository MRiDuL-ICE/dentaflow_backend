import { Global, Module } from '@nestjs/common';
import { Queue } from 'bullmq';
import { JobSchedulerService } from './job-scheduler.service';
import { JobProcessorService } from './job-processor.service';
import { REDIS_CLIENT } from '@database/database.module';
import Redis from 'ioredis';

export const NOTIFICATION_QUEUE = 'notifications';

@Global()
@Module({
  providers: [
    {
      provide: 'NOTIFICATION_QUEUE',
      useFactory: (redis: Redis) =>
        new Queue(NOTIFICATION_QUEUE, {
          connection: redis,
          defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 50,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          },
        }),
      inject: [REDIS_CLIENT],
    },
    JobSchedulerService,
    JobProcessorService,
  ],
  exports: ['NOTIFICATION_QUEUE', JobSchedulerService],
})
export class QueueModule {}
