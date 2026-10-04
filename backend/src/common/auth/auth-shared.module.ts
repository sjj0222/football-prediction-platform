import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET || 'dev-secret-change-me',
        signOptions: {
          expiresIn: (process.env.JWT_EXPIRES_IN as '7d' | number) || '7d',
        },
      }),
    }),
  ],
  exports: [JwtModule],
})
export class AuthSharedModule {}
