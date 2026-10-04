import {
  IsString,
  IsNumber,
  Min,
  Max,
  MaxLength,
  IsISO8601,
} from 'class-validator';
import type { AdminCreateProductRequest } from '@shared/api.interface';

export class AdminCreateProductDto implements AdminCreateProductRequest {
  @IsString()
  @MaxLength(100)
  anchorName!: string;

  @IsISO8601()
  matchTime!: string;

  @IsString()
  @MaxLength(100)
  homeTeam!: string;

  @IsString()
  @MaxLength(100)
  awayTeam!: string;

  @IsString()
  content!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(999999.99)
  price!: number;
}
