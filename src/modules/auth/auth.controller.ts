import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { LoginUserDto } from './dto/login-user.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthGuard } from '@nestjs/passport';
import { ConfirmEmailDto } from './dto/confirm-email.dto';
import { EmailRequestDto } from './dto/email-request.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('authentications')
@ApiHeader({
  name: 'timestamp',
  description: "request's timestamp to prevent attack",
})
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginUserDto: LoginUserDto) {
    return await this.authService.login(loginUserDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return await this.authService.refresh(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req) {
    return await this.authService.logout(req.user);
  }

  @Post('confirm-email')
  async confirmEmail(@Body() body: ConfirmEmailDto) {
    return await this.authService.confirmEmail(body.token);
  }

  @Post('send-confirm-email')
  async sendConfirmEmail(@Body() body: EmailRequestDto) {
    return await this.authService.sendConfirmEmail(body.email);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: EmailRequestDto) {
    return await this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: ResetPasswordDto) {
    return await this.authService.resetPassword(body);
  }
}
