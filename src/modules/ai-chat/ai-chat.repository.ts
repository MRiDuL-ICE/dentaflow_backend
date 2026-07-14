import { Inject, Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { BaseRepository } from '@common/repository/base.repository';
import { TenantClsStore } from '@common/tenant/tenant-cls.interface';
import { GroqMessage } from '@common/ai/groq.interface';
import { Pool } from 'pg';
import { READ_POOL, WRITE_POOL } from '@database/database.module';

@Injectable()
export class AiChatRepository extends BaseRepository {
  constructor(
    cls: ClsService<TenantClsStore>,
    @Inject(WRITE_POOL) writePool: Pool,
    @Inject(READ_POOL) readPool: Pool,
  ) {
    super(cls, writePool, readPool);
  }

  async createSession(data: { patientId?: string; userId: string; context: string }) {
    const rows = await this.execute<Record<string, unknown>>(
      `INSERT INTO ai_chat_sessions
         (patient_id, user_id, context)
       VALUES ($1,$2,$3)
       RETURNING *`,
      [data.patientId ?? null, data.userId, data.context],
    );
    return rows[0];
  }

  async findSession(id: string) {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT id, patient_id, user_id, context, is_active FROM ai_chat_sessions WHERE id = $1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async saveMessage(data: { sessionId: string; role: string; content: string; tokens?: number }) {
    const rows = await this.execute<Record<string, unknown>>(
      `INSERT INTO ai_chat_messages
         (session_id, role, content, tokens)
       VALUES ($1,$2,$3,$4)
       RETURNING *`,
      [data.sessionId, data.role, data.content, data.tokens ?? null],
    );
    return rows[0];
  }

  async getSessionMessages(sessionId: string): Promise<GroqMessage[]> {
    const rows = await this.query<{
      role: string;
      content: string;
    }>(
      `SELECT role, content
       FROM ai_chat_messages
       WHERE session_id = $1
       ORDER BY created_at ASC`,
      [sessionId],
    );

    return rows.map((r) => ({
      role: r.role as 'user' | 'assistant' | 'system',
      content: r.content,
    }));
  }

  async getUserSessions(userId: string) {
    return this.query(
      `SELECT s.*,
              COUNT(m.id)::int AS message_count,
              MAX(m.created_at) AS last_message_at
       FROM ai_chat_sessions s
       LEFT JOIN ai_chat_messages m ON m.session_id = s.id
       WHERE s.user_id = $1 AND s.is_active = true
       GROUP BY s.id
       ORDER BY s.updated_at DESC`,
      [userId],
    );
  }

  async closeSession(id: string) {
    await this.execute(
      `UPDATE ai_chat_sessions
       SET is_active = false, updated_at = now()
       WHERE id = $1`,
      [id],
    );
  }
}
