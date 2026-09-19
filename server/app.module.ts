import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { Module, ValidationPipe } from '@nestjs/common';

import { GlobalExceptionFilter } from './common/filters/exception.filter';
import { AuthSharedModule } from './common/auth/auth-shared.module';
import { ViewModule } from './modules/view/view.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { AdminModule } from './modules/admin/admin.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    DatabaseModule,
    AuthSharedModule,
    // ====== 业务模块 ======
    AuthModule,
    ProductsModule,
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
