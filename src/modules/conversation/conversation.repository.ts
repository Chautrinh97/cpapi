import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Conversation } from './schemas/conversation.schema';

@Injectable()
export class ConversationRepository extends Repository<Conversation> {
  constructor(private readonly dataSource: DataSource) {
    super(Conversation, dataSource.createEntityManager());
  }

  async getConversationsByUser(userId: string): Promise<Conversation[]> {
    return this.createQueryBuilder('conversation')
      .where('conversation.user_id = :userId', { userId })
      .orderBy('conversation.updatedAt', 'DESC')
      .getMany();
  }

  async getConversationWithMessages(conversationSlug: string) {
    return this.createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.messages', 'message')
      .where('conversation.slug = :conversationSlug', { conversationSlug })
      .orderBy('message.createdAt', 'ASC')
      .getOne();
  }
}
