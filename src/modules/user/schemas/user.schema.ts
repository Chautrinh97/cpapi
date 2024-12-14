import {
  Entity,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Relation,
} from 'typeorm';
import { IsEmail, Length } from 'class-validator';
import { Document } from 'src/modules/document/schemas/document.schema';
import { BaseEntity } from 'src/base/base.schema';
import { AuthorityGroup } from 'src/modules/permission/schemas/authority-group.schema';

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
    enum: ['superadmin', 'officer'],
    default: 'officer',
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

  @OneToMany(() => Document, (document) => document.createdBy)
  documents: Document[];

  @ManyToOne(() => AuthorityGroup, (authorityGroup) => authorityGroup.users, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'authority_group_id' })
  authorityGroup: Relation<AuthorityGroup>;
}
