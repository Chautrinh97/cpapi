import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ConversationService } from './conversation.service';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('conversations')
@Controller('conversation')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Post('/chat')
  async chat(
    @Req() request,
    @Body('question') question: string,
    @Res() response: Response,
  ) {
    const stream = await this.conversationService.getChat(
      request.user,
      question,
    );

    response.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    stream.pipe(response);
  }
}
