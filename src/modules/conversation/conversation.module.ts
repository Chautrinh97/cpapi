import { Module } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { ConversationController } from './conversation.controller';
import { UserModule } from '../user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from './schemas/conversation.schema';
import { Message } from './schemas/message.chema';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Message]), UserModule],
  providers: [ConversationService],
  controllers: [ConversationController],
})
export class ConversationModule {}
