import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import type { RegisterRequest } from '@shared/api.interface';

export class RegisterDto implements RegisterRequest {
  @IsString()
  @MinLength(6)
  @MaxLength(20)
  @Matches(/^[0-9+\-() ]+$/, {
    message: '手机号格式不正确',
  })
  phone!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(128)
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d).+$/, {
    message: '密码必须包含字母和数字',
  })
  password!: string;
}
