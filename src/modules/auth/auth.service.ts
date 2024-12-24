import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginUserDto } from './dto/login-user.dto';
import { User } from 'src/modules/user/schemas/user.schema';
import { UserService } from 'src/modules/user/user.service';
import { compare, hash } from 'src/utils/bcrypt';
import { addMinutes } from 'date-fns';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { ForgotPassword } from './schemas/forgot-password.schema';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class AuthService {
  private readonly LOGIN_ATTEMPTS_TO_BLOCK = 5;
  private readonly MINUTES_TO_BLOCK = 5;
  constructor(
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    @InjectRepository(ForgotPassword)
    private readonly forgotPasswordRepository: Repository<ForgotPassword>,
    private readonly configService: ConfigService,
    @InjectQueue('send-email')
    private readonly emailConsumer: Queue,
  ) {}

  async login(loginUserDto: LoginUserDto) {
    const user = await this.userService.findByEmail(loginUserDto.email);
    if (!user) throw new NotFoundException('Not found email.');

    if (user.blockExpires > new Date())
      return { message: 'TEMPORARILY_BLOCKED' };
    if (user.isDisabled) return { message: 'DISABLED_EMAIL' };

    const isMatchedPassword = await compare(
      loginUserDto.password,
      user.password,
    );
    if (!isMatchedPassword) {
      await this.passwordNotMatched(user);
      throw new UnauthorizedException('Wrong email or password.');
    }

    await this.matchedPassword(user);

    if (!user.isVerified) {
      const tokenToVerify = await this.getTokenToVeriy(user.email);
      await this.emailConsumer.add(
        'verify-email',
        {
          email: user.email,
          token: tokenToVerify,
        },
        {
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 3000,
          },
        },
      );
      return { message: 'NOT_VERIFIED_EMAIL' };
    }

    const tokens = await this.getTokens(user);

    return {
      message: 'LOGGED_IN',
      ...tokens,
    };
  }

  async confirmEmail(token) {
    let payload: { email: string };
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('MAIL_SECRETKEY'),
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid tokens.');
    }
    const user = await this.userService.findByEmail(payload.email);
    if (!user) throw new NotFoundException('User not found.');
    if (user.isVerified) {
      throw new ConflictException('User already verified.');
    } else {
      await this.userService.updateOne(
        { email: user.email },
        { isVerified: true },
      );
      return {
        message: 'Email has been confirmed',
      };
    }
  }

  async refresh(oldRefreshToken: any) {
    try {
      const payload = await this.jwtService.verify(oldRefreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
      const user = await this.getUserToRefresh(oldRefreshToken, payload.email);
      const tokens = await this.getTokens(user, true);
      return { email: user.email, ...tokens };
    } catch (e) {
      throw new UnauthorizedException('Invalid token.');
    }
  }

  async validateUser(email: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid token.');
    }
    return user;
  }

  async logout(user: User) {
    await this.userService.updateOne(
      { email: user.email },
      {
        refreshToken: null,
      },
    );
  }

  async sendConfirmEmail(email: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) throw new NotFoundException('User not found.');

    if (user.isVerified) {
      throw new ConflictException('User already verified.');
    }

    const tokenToVerify = await this.getTokenToVeriy(user.email);
    try {
      await this.emailConsumer.add(
        'verify-email',
        {
          email: email,
          token: tokenToVerify,
        },
        {
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 3000,
          },
        },
      );
      return {
        message: 'Email sent successfully.',
      };
    } catch (error) {
      throw new BadRequestException('Error sending mail.');
    }
  }

  async forgotPassword(email: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) throw new NotFoundException('User not found.');

    const forgotPassword = await this.forgotPasswordRepository.findOneBy({
      email: email,
    });
    if (forgotPassword && forgotPassword.expiresAt > new Date()) {
      throw new ConflictException('Email was sent recently.');
    }

    const token = await this.getTokenToResetPassword(user);
    await this.forgotPasswordRepository.save({
      email: email,
      token: await this.encryptToken(token),
      expiresAt: addMinutes(
        new Date(),
        this.configService.get<number>('MINUTES_TO_EXPIRE_RSPW_TOKEN'),
      ),
    });

    try {
      await this.emailConsumer.add(
        'reset-password',
        {
          email: email,
          token: token,
        },
        {
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 3000,
          },
        },
      );
      return {
        message: 'Email sent successfully.',
      };
    } catch (error) {
      await this.forgotPasswordRepository.delete({ email: email });
      throw new BadRequestException('Error sending email.');
    }
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    let payload;
    try {
      payload = await this.jwtService.verifyAsync(resetPasswordDto.token, {
        secret: this.configService.get<string>('JWT_RSPWKEY'),
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid token.');
    }

    const user = await this.userService.findByEmail(payload.email);
    if (!user) throw new NotFoundException('User not found.');

    const forgotPassword = await this.forgotPasswordRepository.findOneBy({
      email: payload.email,
    });
    if (!forgotPassword) throw new BadRequestException('Used token.');

    if (forgotPassword.expiresAt < new Date())
      throw new BadRequestException('Expired token.');

    const isMatchedToken = await compare(
      this.reverse(resetPasswordDto.token),
      forgotPassword.token,
    );
    if (!isMatchedToken) throw new UnauthorizedException('Invalid token.');

    await this.forgotPasswordRepository.delete({ email: payload.email });

    await this.userService.updateOne(
      { email: payload.email },
      {
        password: await hash(resetPasswordDto.password),
      },
    );

    if (!user.isVerified) {
      await this.userService.updateOne(
        { email: payload.email },
        {
          isVerified: true,
        },
      );
    }

    return {
      message: 'Password reset successfully',
    };
  }

  //------------------------PRIVATE METHOD----------------------------
  //------------------------------------------------------------------
  //------------------------------------------------------------------
  //------------------------PRIVATE METHOD----------------------------
  //------------------------------------------------------------------
  //------------------------------------------------------------------
  //------------------------PRIVATE METHOD----------------------------
  //------------------------------------------------------------------
  //------------------------------------------------------------------

  private async getTokenToVeriy(email: string) {
    return await this.jwtService.signAsync(
      { email: email },
      {
        expiresIn: this.configService.get('MAIL_EXPIRATION'),
        secret: this.configService.get<string>('MAIL_SECRETKEY'),
      },
    );
  }

  private async getTokenToResetPassword(user) {
    return await this.jwtService.signAsync(
      { email: user.email },
      {
        secret: this.configService.get<string>('JWT_RSPWKEY'),
      },
    );
  }

  private async matchedPassword(user) {
    await this.userService.updateOne(
      { email: user.email },
      {
        loginAttempts: 0,
      },
    );
  }

  private async passwordNotMatched(user) {
    if (user.loginAttempts >= this.LOGIN_ATTEMPTS_TO_BLOCK) {
      await this.blockUser(user);
    } else {
      await this.userService.updateOne(
        { email: user.email },
        {
          loginAttempts: user.loginAttempts + 1,
        },
      );
    }
  }

  private reverse(stringToReverse: any) {
    return stringToReverse.split('').reverse().join('');
  }

  private async encryptToken(token: any) {
    const reversed = this.reverse(token);
    return await hash(reversed);
  }

  private async blockUser(user) {
    const blockExpires = addMinutes(new Date(), this.MINUTES_TO_BLOCK);
    await this.userService.updateOne(
      { email: user.email },
      {
        blockExpires: blockExpires,
      },
    );
  }

  private async getTokens(user: User, isRefresh = false) {
    const accessToken = this.jwtService.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        permissions: user.authorityGroup?.permissions.map((perm) => perm.name),
      },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_EXPIRATION'),
      },
    );

    if (!isRefresh) {
      const refreshToken = this.jwtService.sign(
        { email: user.email },
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION'),
        },
      );
      const updatedRefreshToken = await this.encryptToken(refreshToken);
      await this.userService.updateOne(
        { email: user.email },
        {
          refreshToken: updatedRefreshToken,
        },
      );
      return { accessToken, refreshToken };
    }
    return { accessToken };
  }

  private async getUserToRefresh(refreshToken: string, email: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) throw new NotFoundException('Invalid token.');
    const isMatchedToken = await compare(
      this.reverse(refreshToken),
      user.refreshToken,
    );
    if (!isMatchedToken)
      throw new UnauthorizedException('Invalid credentials.');
    return user;
  }
}
