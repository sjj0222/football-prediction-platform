import { Module } from '@nestjs/common';
import { SellerController } from './seller.controller';
import { SellerService } from './seller.service';
import { ProductsModule } from '../products/products.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, ProductsModule],
  controllers: [SellerController],
  providers: [SellerService],
})
export class SellerModule {}
