import { Body, Controller, Post, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ConversationService } from './conversation.service';
import { Response } from 'express';

@ApiTags('conversations')
@Controller('conversation')
@ApiBearerAuth()
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Post('/chat')
  async chat(@Body('question') question: string, @Res() response: Response) {
    const stream = await this.conversationService.getChat(question);

    response.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    stream.pipe(response);
  }
}
