import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({ example: 'newusername', required: false })
  @IsString()
  @IsOptional()
  @MinLength(3)
  username?: string;

  @ApiProperty({ example: 'newemail@example.com', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: '+33688888888', required: false })
  @IsString()
  @IsOptional()
  phone?: string;
}

export class StartKycDto {
  @ApiProperty({ example: 'passport', description: 'Type of identity document (e.g. passport, id_card)' })
  @IsString()
  @IsNotEmpty()
  documentType!: string;
}

export class UploadKycDto {
  @ApiProperty({ example: 'https://storage.provider.com/kyc/doc_url.jpg', description: 'URL of uploaded document' })
  @IsString()
  @IsNotEmpty()
  documentUrl!: string;
}

export class BiometricsDto {
  @ApiProperty({ example: 'biometric-signature-hash-string-abc-123', description: 'Biometric signature data' })
  @IsString()
  @IsNotEmpty()
  biometricsKey!: string;
}
