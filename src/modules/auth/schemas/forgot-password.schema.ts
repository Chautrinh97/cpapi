import { Entity, Column, PrimaryGeneratedColumn, Unique, Index } from 'typeorm';
import { IsEmail } from 'class-validator';

@Entity('forgot_passwords')
@Unique(['email'])
@Index('email_index', ['email'])
export class ForgotPassword {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    length: 255,
    unique: true,
    nullable: false,
  })
  @IsEmail({}, { message: 'INVALID_EMAIL' })
  email: string;

  @Column({
    length: 255,
    nullable: false,
  })
  token: string;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  expiresAt: Date;
}
