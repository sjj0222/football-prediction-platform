import {
  IsString,
  MaxLength,
  IsOptional,
  IsISO8601,
} from 'class-validator';
import type { AdminUpdateProductRequest } from '@shared/api.interface';

export class AdminUpdateProductDto implements AdminUpdateProductRequest {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  anchorName?: string;

  @IsOptional()
  @IsISO8601()
  matchTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  homeTeam?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  awayTeam?: string;

  @IsOptional()
  @IsString()
  content?: string;
}
