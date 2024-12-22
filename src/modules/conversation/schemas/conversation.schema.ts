import { BaseEntity } from 'src/base/base.schema';
import { User } from 'src/modules/user/schemas/user.schema';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  Relation,
} from 'typeorm';
import { Message } from './message.chema';

@Entity('conversations')
export class Conversation extends BaseEntity {
  @ManyToOne(() => User, (user) => user.conversations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Message[];

  @Column()
  slug: string;
}
