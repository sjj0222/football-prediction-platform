import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuthModule } from '../auth/auth.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [AuthModule, WalletModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
