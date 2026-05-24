import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWalletDto {
  @ApiProperty({ example: 'USD', default: 'USD', description: 'Currency for the new wallet (e.g. USD, EUR, XAF)' })
  @IsString()
  @IsOptional()
  currency?: string;
}
