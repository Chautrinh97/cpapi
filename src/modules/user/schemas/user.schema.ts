import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Unique,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { IsEmail, Length } from 'class-validator';

@Entity('users')
@Unique(['email'])
export class User {
  @PrimaryGeneratedColumn()
  id: number;

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
    enum: ['superadmin', 'admin', 'officer'],
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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
