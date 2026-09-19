import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthGuard, type AuthenticatedRequest } from './auth.guard';
import type {
  UserInfo,
  LoginResponse,
  CaptchaResponse,
} from '@shared/api.interface';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto): Promise<{ user: UserInfo }> {
    const user = await this.authService.register(dto);
    return { user };
  }

  @Get('captcha')
  getCaptcha(): CaptchaResponse {
    return this.authService.getCaptcha();
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto): Promise<LoginResponse> {
    return this.authService.login(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  logout(@Req() req: AuthenticatedRequest): { success: boolean } {
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.slice(7) : '';
    this.authService.logout(token);
    return { success: true };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  getMe(@Req() req: AuthenticatedRequest): { user: UserInfo } {
    return { user: req.user };
  }
}
