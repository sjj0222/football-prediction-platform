import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import type { UserInfo } from '@shared/api.interface';

export interface AuthenticatedRequest extends Request {
  user: UserInfo;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('未提供有效的认证令牌');
    }

    const token = authHeader.slice(7);
    const user = await this.authService.validateToken(token);

    if (!user) {
      throw new UnauthorizedException('认证令牌无效或已过期');
    }

    request.user = user;
    return true;
  }
}
