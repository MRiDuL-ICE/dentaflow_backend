import { Module } from '@nestjs/common';
import { AiChatController } from './ai-chat.controller';
import { AiChatService } from './ai-chat.service';
import { AiChatRepository } from './ai-chat.repository';

@Module({
  controllers: [AiChatController],
  providers: [AiChatService, AiChatRepository],
})
export class AiChatModule {}
