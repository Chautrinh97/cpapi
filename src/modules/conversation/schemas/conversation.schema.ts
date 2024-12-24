import { User } from 'src/modules/user/schemas/user.schema';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { Message } from './message.chema';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', nullable: false, default: 'Hội thoại mới' })
  title: string;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at', nullable: true })
  createdAt: Date;

  @Column({ type: 'timestamp', name: 'updated_at', nullable: true })
  updatedAt: Date;

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
