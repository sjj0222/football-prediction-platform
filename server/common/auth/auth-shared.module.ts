import { Module, Global } from '@nestjs/common';
import { TokenStore } from './token.store';

@Global()
@Module({
  providers: [TokenStore],
  exports: [TokenStore],
})
export class AuthSharedModule {}
