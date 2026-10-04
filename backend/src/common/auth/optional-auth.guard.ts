import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

interface JwtPayload {
  sub: string;
  role: string;
}

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const authHeader: string | undefined = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return true;
    }

    const token = authHeader.slice('Bearer '.length).trim();
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      (req as { appUser?: { userId: string; role: string } }).appUser = {
        userId: payload.sub,
        role: payload.role,
      };
    } catch {
      // token 无效则视为未登录
    }

    return true;
  }
}
