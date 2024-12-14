import { forwardRef, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { UserModule } from 'src/modules/user/user.module';
import * as dotenv from 'dotenv';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ForgotPassword } from './schemas/forgot-password.schema';
import { BullModule } from '@nestjs/bullmq';
import { EmailConsumer } from './comsumers/email.consumer';
dotenv.config();
@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.JWT_EXPIRATION },
    }),
    TypeOrmModule.forFeature([ForgotPassword]),
    forwardRef(() => UserModule),
    BullModule.registerQueue({
      name: 'send-email',
    }),
  ],
  providers: [AuthService, JwtStrategy, EmailConsumer],
  exports: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
