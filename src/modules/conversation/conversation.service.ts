import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConversationRepository } from './conversation.repository';
import { v4 as uuidv4 } from 'uuid';
@Injectable()
export class ConversationService {
  constructor(
    private readonly conversationRepository: ConversationRepository,
  ) {}

  async getConversationsByUser(user) {
    const conversations =
      await this.conversationRepository.getConversationsByUser(user.id);
    return { data: conversations };
  }

  async getConversationMessages(user, conversationSlug: string) {
    const conversation = await this.conversationRepository.findOne({
      where: { slug: conversationSlug },
      relations: ['user'],
    });
    if (!conversation) throw new NotFoundException('NOT_FOUND_CONVERSATION');

    if (conversation.user.id !== user.id)
      throw new ForbiddenException('NOT_YOUR_CONVERSATION');
    const conversationWithMessages =
      await this.conversationRepository.getConversationWithMessages(
        conversationSlug,
      );
    return conversationWithMessages;
  }

  async createConversation(user) {
    const lastConversation = await this.conversationRepository.findOne({
      where: { user: { id: user.id } },
      order: { createdAt: 'DESC' },
      relations: ['messages'],
    });
    if (lastConversation && lastConversation.messages.length === 0) {
      throw new ForbiddenException('LAST_CONVERSATION_NO_MESSAGE');
    }

    const slug = uuidv4();
    const conversation = await this.conversationRepository.create({
      slug: slug,
      title: 'Hội thoại mới',
      updatedAt: new Date(),
      user: user.id,
    });
    return await this.conversationRepository.save(conversation);
  }

  async renameConversation(id: number, dto: { title: string }) {
    const conversation = await this.conversationRepository.findOne({
      where: { id: id },
    });
    if (!conversation) throw new NotFoundException('NOT_FOUND_CONVERSATION');
    conversation.title = dto.title;
    await this.conversationRepository.save(conversation);
  }

  async deleteConversation(id: number) {
    const conversation = await this.conversationRepository.findOne({
      where: { id: id },
    });
    if (!conversation) throw new NotFoundException('NOT_FOUND_CONVERSATION');
    await this.conversationRepository.remove(conversation);
  }
}
