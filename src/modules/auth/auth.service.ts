import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginUserDto } from './dto/login-user.dto';
import { User } from 'src/modules/user/schemas/user.schema';
import { UserService } from 'src/modules/user/user.service';
import { compare, hash } from 'src/utils/bcrypt';
import { addHours, addMinutes } from 'date-fns';
import { MailerService } from '@nestjs-modules/mailer';
import { AuthRepository } from './auth.repository';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VendorService } from 'src/modules/vendor/vendor.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
@Injectable()
export class AuthService {
  private readonly LOGIN_ATTEMPTS_TO_BLOCK = 5;
  private readonly MINUTES_TO_BLOCK = 5;
  private readonly HOUR_TO_RESET_PASSWORD = 24;
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly mailService: MailerService,
    private readonly authRepository: AuthRepository,
    private readonly vendorService: VendorService,
  ) {}

  async login(loginUserDto: LoginUserDto) {
    const user = await this.userService.findByEmail(loginUserDto.email);
    if (!user) throw new NotFoundException('Not found email.');

    this.isUserBlocked(user);

    const isMatchedPassword = await compare(
      loginUserDto.password,
      user.password,
    );
    if (!isMatchedPassword) {
      await this.passwordNotMatched(user);
      throw new UnauthorizedException('Wrong email or password.');
    }

    await this.matchedPassword(user);

    const tokens = await this.getTokens(user);

    if (!user.isVerified) {
      const tokenToVerify = await this.getTokenToVeriy(user);
      await this.sendEmailConfirm(user, tokenToVerify);
    }

    return {
      user: {
        userId: user.id,
        email: user.email,
        name: user.fullName,
        role: user.role,
        isVerified: user.isVerified,
      },
      ...tokens,
    };
  }

  async register(createUserDto: CreateUserDto) {
    const newVendor = await this.vendorService.create({});
    const newUser = await this.userService.create(
      {
        ...createUserDto,
        vendorId: newVendor._id.toString(),
        role: 'vendorowner',
      },
      null,
    );

    const tokenToVerify = await this.getTokenToVeriy(newUser);
    await this.sendEmailConfirm(newUser, tokenToVerify);

    const tokens = await this.getTokens(newUser);

    return {
      user: {
        userId: newUser.id,
        email: newUser.email,
        name: newUser.fullName,
        role: newUser.role,
        isVerified: newUser.isVerified,
      },
      ...tokens,
    };
  }

  async confirmEmail(token) {
    let payload: { email: string };
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.MAIL_SECRETKEY,
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
        message: 'Confirmed successfully',
      };
    }
  }

  async refresh(oldRefreshToken: any) {
    try {
      const payload = await this.jwtService.verify(oldRefreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
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

  async resendConfirmEmail(email: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) throw new NotFoundException('User not found.');

    if (user.isVerified) {
      throw new ConflictException('User already verified.');
    }

    const tokenToVerify = await this.getTokenToVeriy(user);
    try {
      await this.sendEmailConfirm(user, tokenToVerify);
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

    const forgotPassword = await this.authRepository.findForgotPassword(email);
    if (forgotPassword && forgotPassword.expiresAt > new Date()) {
      throw new ConflictException('Email was sent recently.');
    }

    const token = await this.getTokenToResetPassword(user);
    await this.authRepository.create({
      email: email,
      token: await this.encryptToken(token),
      expiresAt: addHours(new Date(), this.HOUR_TO_RESET_PASSWORD),
    });

    try {
      await this.sendEmailResetPassword(user, token);
      return {
        message: 'Email sent successfully.',
      };
    } catch (error) {
      await this.authRepository.deleteForgotPassword(email);
      throw new BadRequestException('Error sending email.');
    }
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    let payload;
    try {
      payload = await this.jwtService.verifyAsync(resetPasswordDto.token, {
        secret: process.env.JWT_RSPWKEY,
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid token.');
    }

    const user = await this.userService.findByEmail(payload.email);
    if (!user) throw new NotFoundException('User not found.');

    const forgotPassword = await this.authRepository.findForgotPassword(
      payload.email,
    );
    if (!forgotPassword) throw new BadRequestException('Used token.');

    if (forgotPassword.expiresAt < new Date())
      throw new BadRequestException('Expired token.');

    const isMatchedToken = await compare(
      this.reverse(resetPasswordDto.token),
      forgotPassword.token,
    );
    if (!isMatchedToken) throw new UnauthorizedException('Invalid token.');

    await this.authRepository.deleteForgotPassword(payload.email);

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

  private async getTokenToVeriy(user) {
    return await this.jwtService.signAsync(
      { email: user.email },
      {
        expiresIn: process.env.MAIL_EXPIRATION,
        secret: process.env.MAIL_SECRETKEY,
      },
    );
  }

  private async getTokenToResetPassword(user) {
    return await this.jwtService.signAsync(
      { email: user.email },
      {
        secret: process.env.JWT_RSPWKEY,
      },
    );
  }

  private async sendEmailConfirm(user, token) {
    await this.mailService.sendMail({
      to: user.email,
      subject: 'Xác nhận email',
      template: './base',
      context: {
        email: user.email,
        title: 'Chatbot - Xác minh email',
        heading: 'Xác minh email của bạn.',
        introduction:
          'Bạn nhận được email này vì đã đăng ký dịch vụ Chatbot của chúng tôi.',
        instruction:
          'Nhấn vào nút bên dưới để xác minh địa chỉ email và kích hoạt tài khoản. Nếu bạn không tạo tài khoản với ',
        website: `${process.env.WEB_ADDRESS}`,
        webname: 'Chatbot',
        instruction2: ', bạn có thể xóa email này một cách an toàn.',
        warning: '',
        link: `${process.env.WEB_ADDRESS}/auth/complete-confirm?verify-from=${token}`,
        button: 'Xác minh',
      },
    });
  }

  private async sendEmailResetPassword(user, token) {
    await this.mailService.sendMail({
      to: user.email,
      subject: 'Đặt lại mật khẩu',
      template: './base',
      context: {
        email: user.email,
        title: 'Chatbot - Đặt lại mật khẩu',
        heading: 'Thiết lập mật khẩu mới.',
        introduction: 'Bạn nhận được email này vì đã yêu cầu đặt lại mật khẩu.',
        instruction:
          `Nhấn vào nút bên dưới để đặt lại mật khẩu của bạn.` +
          `Nếu không phải bạn gửi yêu cầu, bạn có thể xóa email này một cách an toàn.`,
        website: '',
        webname: '',
        instruction2: '',
        warning: `Chỉ có hiệu lực trong vòng ${this.HOUR_TO_RESET_PASSWORD} giờ.`,
        link: `${process.env.WEB_ADDRESS}/auth/reset-password?reset-from=${token}`,
        button: 'Đặt lại mật khẩu',
      },
    });
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

  private isUserBlocked(user) {
    if (user.blockExpires > new Date()) {
      throw new ConflictException('User is currently blocked.');
    }
  }

  private isUserDisabled(user) {
    if (user.isDisabled) {
      throw new ForbiddenException('User is currently disabled.');
    }
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
        email: user.email,
      },
      {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRATION,
      },
    );

    if (!isRefresh) {
      const refreshToken = this.jwtService.sign(
        { email: user.email },
        {
          secret: process.env.JWT_REFRESH_SECRET,
          expiresIn: process.env.JWT_REFRESH_EXPIRATION,
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
    if (!user) throw new UnauthorizedException('Invalid token.');
    const isMatchedToken = await compare(
      this.reverse(refreshToken),
      user.refreshToken,
    );
    if (!isMatchedToken)
      throw new UnauthorizedException('Invalid credentials.');
    return user;
  }
}
