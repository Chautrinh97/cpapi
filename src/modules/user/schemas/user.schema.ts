import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Relation,
  OneToMany,
} from 'typeorm';
import { IsEmail, Length } from 'class-validator';
import { BaseEntity } from 'src/base/base.schema';
import { AuthorityGroup } from 'src/modules/permission/schemas/authority-group.schema';
import { Conversation } from 'src/modules/conversation/schemas/conversation.schema';

export enum UserRole {
  SUPERAMIN = 'superadmin',
  OFFICER = 'officer',
  GUEST = 'guest',
}
@Entity('users')
export class User extends BaseEntity {
  @Column({ length: 255 })
  fullName: string;

  @Column({ length: 255, unique: true })
  @IsEmail({}, { message: 'INVALID_EMAIL' })
  email: string;

  @Column({ length: 1024 })
  @Length(6, 1024, { message: 'PASSWORD_IS_BLANK' })
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.OFFICER,
  })
  role: string;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ default: 0 })
  loginAttempts: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  blockExpires: Date;

  @Column({ type: 'text', nullable: true })
  refreshToken: string | null;

  @Column({ default: false })
  isDisabled: boolean;

  @ManyToOne(() => AuthorityGroup, (authorityGroup) => authorityGroup.users, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'authority_group_id' })
  authorityGroup: Relation<AuthorityGroup>;

  @OneToMany(() => Conversation, (conversation) => conversation.user)
  conversations: Conversation[];
}
