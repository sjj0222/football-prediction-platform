import { IsString, IsIn } from 'class-validator';
import type { AdminSetResultRequest } from '@shared/api.interface';

export class AdminSetResultDto implements AdminSetResultRequest {
  @IsString()
  @IsIn(['pending', 'red', 'black', 'no_result'])
  result!: 'pending' | 'red' | 'black' | 'no_result';
}
