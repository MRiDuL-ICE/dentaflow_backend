import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { AiChatService } from './ai-chat.service';
import { StartChatSessionDto, SendMessageDto } from './dto/chat.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';

@ApiTags('ai-chat')
@ApiSecurity('clinic-slug')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('ai/chat')
export class AiChatController {
  constructor(private readonly aiChatService: AiChatService) {}

  @Post('sessions')
  @ApiOperation({ summary: 'Start a new AI chat session' })
  startSession(@Body() dto: StartChatSessionDto, @CurrentUser() user: AuthUser) {
    return this.aiChatService.startSession(dto, user.id);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Get user chat sessions' })
  getSessions(@CurrentUser() user: AuthUser) {
    return this.aiChatService.getUserSessions(user.id);
  }

  @Post('sessions/:id/messages')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send message to AI' })
  sendMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.aiChatService.sendMessage(id, dto, user.id);
  }

  @Get('sessions/:id/history')
  @ApiOperation({ summary: 'Get session message history' })
  getHistory(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.aiChatService.getSessionHistory(id, user.id);
  }

  @Delete('sessions/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Close chat session' })
  closeSession(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.aiChatService.closeSession(id, user.id);
  }
}
