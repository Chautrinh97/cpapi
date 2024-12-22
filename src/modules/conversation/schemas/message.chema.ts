import { BaseEntity } from 'src/base/base.schema';
import { Column, Entity, JoinColumn, ManyToOne, Relation } from 'typeorm';
import { Conversation } from './conversation.schema';

export enum MessageRole {
  ASSISTANT = 'assistant',
  USER = 'user',
}
@Entity('messages')
export class Message extends BaseEntity {
  @ManyToOne(() => Conversation, (conversation) => conversation.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Relation<Conversation>;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'enum', enum: MessageRole })
  role: MessageRole;
}
