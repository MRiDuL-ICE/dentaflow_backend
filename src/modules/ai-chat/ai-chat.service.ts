import {
  Injectable, NotFoundException,
  ForbiddenException, Inject,
} from '@nestjs/common';
import { AiChatRepository } from './ai-chat.repository';
import { GroqService } from '@common/ai/groq.service';
import { REDIS_CLIENT } from '@database/database.module';
import Redis from 'ioredis';
import { StartChatSessionDto, SendMessageDto } from './dto/chat.dto';
import { GroqMessage } from '@common/ai/groq.interface';

const SESSION_CACHE_TTL = 60 * 60; // 1 hour
const MAX_CONTEXT_MESSAGES = 20;   // keep last 20 messages in context

@Injectable()
export class AiChatService {
  constructor(
    private readonly chatRepo:  AiChatRepository,
    private readonly groq:      GroqService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async startSession(
    dto:    StartChatSessionDto,
    userId: string,
  ) {
    const context = dto.context ?? 'patient_assistant';
    const session = await this.chatRepo.createSession({
      patientId: dto.patientId,
      userId,
      context,
    });

    // Cache session in Redis
    const cacheKey = `chat:session:${session['id'] as string}`;
    await this.redis.set(
      cacheKey,
      JSON.stringify(session),
      'EX',
      SESSION_CACHE_TTL,
    );

    return session;
  }

  async sendMessage(
    sessionId: string,
    dto:       SendMessageDto,
    userId:    string,
  ) {
    // Get session
    const session = await this.chatRepo.findSession(sessionId);
    if (!session)
      throw new NotFoundException(`Session not found: ${sessionId}`);

    if (session['user_id'] !== userId)
      throw new ForbiddenException('Not your session');

    // Get system prompt based on context
    const systemPrompt = session['context'] === 'clinical_assistant'
      ? this.groq.getClinicalNotesPrompt()
      : this.groq.getDentalAssistantPrompt();

    // Get chat history (from Redis first, fallback to DB)
    const cacheKey    = `chat:history:${sessionId}`;
    let   history:    GroqMessage[] = [];
    const cached      = await this.redis.get(cacheKey);

    if (cached) {
      history = JSON.parse(cached) as GroqMessage[];
    } else {
      history = await this.chatRepo.getSessionMessages(sessionId);
      await this.redis.set(
        cacheKey,
        JSON.stringify(history),
        'EX',
        SESSION_CACHE_TTL,
      );
    }

    // Build messages for Groq (keep last N for context window)
    const contextMessages = history.slice(-MAX_CONTEXT_MESSAGES);
    const messages: GroqMessage[] = [
      { role: 'system', content: systemPrompt },
      ...contextMessages,
      { role: 'user',   content: dto.message },
    ];

    // Call Groq
    const response = await this.groq.chat(messages);

    // Save user message to DB
    await this.chatRepo.saveMessage({
      sessionId,
      role:    'user',
      content: dto.message,
    });

    // Save assistant response to DB
    const saved = await this.chatRepo.saveMessage({
      sessionId,
      role:    'assistant',
      content: response.content,
      tokens:  response.tokens,
    });

    // Update Redis cache with new messages
    const updatedHistory: GroqMessage[] = [
      ...history,
      { role: 'user',      content: dto.message },
      { role: 'assistant', content: response.content },
    ];
    await this.redis.set(
      cacheKey,
      JSON.stringify(updatedHistory),
      'EX',
      SESSION_CACHE_TTL,
    );

    return {
      messageId: saved['id'],
      response:  response.content,
      tokens:    response.tokens,
    };
  }

  async getSessionHistory(sessionId: string, userId: string) {
    const session = await this.chatRepo.findSession(sessionId);
    if (!session)
      throw new NotFoundException(`Session not found: ${sessionId}`);

    if (session['user_id'] !== userId)
      throw new ForbiddenException('Not your session');

    return this.chatRepo.getSessionMessages(sessionId);
  }

  getUserSessions(userId: string) {
    return this.chatRepo.getUserSessions(userId);
  }

  async closeSession(sessionId: string, userId: string) {
    const session = await this.chatRepo.findSession(sessionId);
    if (!session)
      throw new NotFoundException(`Session not found: ${sessionId}`);

    if (session['user_id'] !== userId)
      throw new ForbiddenException('Not your session');

    await this.chatRepo.closeSession(sessionId);

    // Clear Redis cache
    await Promise.all([
      this.redis.del(`chat:session:${sessionId}`),
      this.redis.del(`chat:history:${sessionId}`),
    ]);

    return { message: 'Session closed' };
  }
}
