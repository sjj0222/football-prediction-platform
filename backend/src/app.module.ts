import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { Module, ValidationPipe } from '@nestjs/common';

import { GlobalExceptionFilter } from './common/filters/exception.filter';
import { AuthSharedModule } from './common/auth/auth-shared.module';
import { ViewModule } from './view/view.module';
import { AuthModule } from './auth/auth.module';
import { MatchesModule } from './matches/matches.module';
import { ProductsModule } from './products/products.module';
import { SellerModule } from './seller/seller.module';
import { OrdersModule } from './orders/orders.module';
import { AdminModule } from './admin/admin.module';
import { UsersModule } from './users/users.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    DatabaseModule,
    AuthSharedModule,
    // ====== 业务模块 ======
    AuthModule,
    UsersModule,
    MatchesModule,
    ProductsModule,
    SellerModule,
    OrdersModule,
    AdminModule,
    // ViewModule 是兜底路由模块，必须放最后
    ViewModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    },
  ],
})
export class AppModule {}
