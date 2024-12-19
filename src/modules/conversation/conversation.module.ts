import { Module } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { ConversationController } from './conversation.controller';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserModule],
  providers: [ConversationService],
  controllers: [ConversationController],
})
export class ConversationModule {}
