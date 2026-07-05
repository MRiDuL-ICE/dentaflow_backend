import { Module, Global } from '@nestjs/common';
import { GroqService }         from './groq.service';
import { HuggingFaceService }  from './huggingface.service';

@Global()
@Module({
  providers: [GroqService, HuggingFaceService],
  exports:   [GroqService, HuggingFaceService],
})
export class AiModule {}
