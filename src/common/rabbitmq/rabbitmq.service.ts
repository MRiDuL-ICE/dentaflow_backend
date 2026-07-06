import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqplib from 'amqplib';
import { EXCHANGES, QUEUES, RabbitMQEvent } from './rabbitmq.interface';

@Injectable()
export class RabbitMQService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: amqplib.ChannelModel | null = null;
  private channel: amqplib.Channel | null = null;

  constructor(private readonly config: ConfigService) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.connect();
  }

  async onApplicationShutdown(): Promise<void> {
    await this.disconnect();
  }

  private async connect(): Promise<void> {
    try {
      const url = this.config.get<string>('RABBITMQ_URL') ?? 'amqp://guest:guest@localhost:5672';

      this.connection = await amqplib.connect(url);
      this.channel = await this.connection.createChannel();

      // Setup exchange
      await this.channel.assertExchange(EXCHANGES.DENTAFLOW, 'topic', { durable: true });

      // Setup queues + bindings
      for (const queue of Object.values(QUEUES)) {
        await this.channel.assertQueue(queue, { durable: true });
      }

      // Bind queues to exchange
      await this.channel.bindQueue(QUEUES.APPOINTMENT_EVENTS, EXCHANGES.DENTAFLOW, 'appointment.*');
      await this.channel.bindQueue(QUEUES.TREATMENT_EVENTS, EXCHANGES.DENTAFLOW, 'treatment.*');
      await this.channel.bindQueue(QUEUES.INVENTORY_EVENTS, EXCHANGES.DENTAFLOW, 'inventory.*');
      await this.channel.bindQueue(QUEUES.NOTIFICATION_EVENTS, EXCHANGES.DENTAFLOW, 'invoice.*');

      this.logger.log('RabbitMQ connected and queues ready');
    } catch (err) {
      this.logger.error('RabbitMQ connection failed:', err);
    }
  }

  async publish(routingKey: string, event: Omit<RabbitMQEvent, 'timestamp'>): Promise<void> {
    if (!this.channel) {
      this.logger.warn('RabbitMQ channel not ready — skipping event publish');
      return;
    }

    const message: RabbitMQEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    this.channel.publish(EXCHANGES.DENTAFLOW, routingKey, Buffer.from(JSON.stringify(message)), {
      persistent: true,
    });

    this.logger.debug(`Published: ${routingKey}`);
  }

  async consume(queue: string, handler: (event: RabbitMQEvent) => Promise<void>): Promise<void> {
    if (!this.channel) {
      this.logger.warn('RabbitMQ channel not ready');
      return;
    }

    await this.channel.consume(queue, async (msg) => {
      if (!msg) return;

      try {
        const event = JSON.parse(msg.content.toString()) as RabbitMQEvent;

        await handler(event);
        this.channel?.ack(msg);
      } catch (err) {
        this.logger.error('Message processing failed:', err);
        // Nack and requeue once
        this.channel?.nack(msg, false, false);
      }
    });
  }

  private async disconnect(): Promise<void> {
    try {
      await this.channel?.close();
      await this.connection?.close();
    } catch {
      // ignore on shutdown
    }
  }
}
