import { BadRequestException, Injectable } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
@Injectable()
export class ConversationService {
  constructor(private readonly configService: ConfigService) {}
  async getChat(question: string) {
    if (!question) throw new BadRequestException('question is required');

    const chatResponse = await axios.post(
      `${this.configService.get<string>('CHATBOT_ENDPOINT')}/chat`,
      JSON.stringify({ question }),
      {
        responseType: 'stream',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
    return chatResponse.data;
  }
}
