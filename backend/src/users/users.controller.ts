import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import type { UserInfo } from '@shared/api.interface';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(AuthGuard)
  async getMe(@Req() req: AuthenticatedRequest): Promise<{ user: UserInfo }> {
    // req.user 由 AuthGuard 注入（validateToken 已查库）
    return { user: req.user };
  }
}
