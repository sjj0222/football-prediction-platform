import { IsString, MinLength, MaxLength } from 'class-validator';
import type { LoginRequest } from '@shared/api.interface';

export class LoginDto implements LoginRequest {
  @IsString()
  @MinLength(6)
  @MaxLength(20)
  phone!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password!: string;
}
