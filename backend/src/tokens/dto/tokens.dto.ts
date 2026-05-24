import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTokenDto {
  @ApiProperty({ example: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', description: 'Blockchain smart contract mint address', required: false })
  @IsString()
  @IsOptional()
  mintAddress?: string;

  @ApiProperty({ example: 'USD Coin', description: 'Full name of the token' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'USDC', description: 'Ticker symbol of the token' })
  @IsString()
  @IsNotEmpty()
  symbol!: string;

  @ApiProperty({ example: 6, description: 'Number of decimal places the token supports' })
  @IsInt()
  @IsNotEmpty()
  decimals!: number;
}
