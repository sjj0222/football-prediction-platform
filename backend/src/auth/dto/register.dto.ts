import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import type { RegisterRequest } from '@shared/api.interface';

export class RegisterDto implements RegisterRequest {
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(128)
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d).+$/, {
    message: '密码必须包含字母和数字',
  })
  password!: string;

  @IsString()
  captchaId!: string;

  @IsString()
  captchaCode!: string;
}
