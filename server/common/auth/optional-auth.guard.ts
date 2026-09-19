import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { TokenStore } from './token.store';

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private readonly tokenStore: TokenStore) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const authHeader: string | undefined = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return true;
    }

    const token = authHeader.slice('Bearer '.length).trim();
    const userId = await this.tokenStore.get(token);

    if (userId) {
      req.appUser = { userId };
    }

    return true;
  }
}
