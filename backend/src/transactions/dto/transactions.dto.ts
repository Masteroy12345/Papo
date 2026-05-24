import { IsArray, IsInt, IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendTransactionDto {
  @ApiProperty({ example: 1, description: 'ID of the sender wallet' })
  @IsInt()
  @IsNotEmpty()
  walletFrom!: number;

  @ApiProperty({ example: '0x321...', description: 'Destination wallet address' })
  @IsString()
  @IsNotEmpty()
  walletToAddress!: string;

  @ApiProperty({ example: 1, description: 'ID of the token being sent' })
  @IsInt()
  @IsNotEmpty()
  tokenId!: number;

  @ApiProperty({ example: 10.5, description: 'Amount of funds to transfer' })
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  amount!: number;
}

export class OfflineInitDto {
  @ApiProperty({ example: 1, description: 'ID of the sender wallet' })
  @IsInt()
  @IsNotEmpty()
  walletFrom!: number;

  @ApiProperty({ example: '0x321...', description: 'Destination wallet address' })
  @IsString()
  @IsNotEmpty()
  walletToAddress!: string;

  @ApiProperty({ example: 1, description: 'ID of the token being sent' })
  @IsInt()
  @IsNotEmpty()
  tokenId!: number;

  @ApiProperty({ example: 50.0, description: 'Amount of funds to pre-authorize offline' })
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  amount!: number;
}

export class OfflineConfirmDto {
  @ApiProperty({ example: 12, description: 'ID of the offline transaction to confirm' })
  @IsInt()
  @IsNotEmpty()
  transactionId!: number;

  @ApiProperty({ example: '0xabc...', description: 'Cryptographic signature from the sender' })
  @IsString()
  @IsNotEmpty()
  signature!: string;
}

export class OfflineSyncDto {
  @ApiProperty({ example: [12, 13], description: 'List of offline transaction IDs to synchronize with the database' })
  @IsArray()
  @IsInt({ each: true })
  transactionIds!: number[];
}
