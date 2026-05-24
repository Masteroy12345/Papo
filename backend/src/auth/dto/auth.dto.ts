import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'johndoe', description: 'Unique username for the user' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  username!: string;

  @ApiProperty({ example: 'johndoe@example.com', description: 'Unique email address' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'password123', description: 'Secure password', minLength: 6 })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;

  @ApiProperty({ example: '+33612345678', description: 'Optional phone number', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'USD', description: 'Default currency of the primary wallet', default: 'USD', required: false })
  @IsString()
  @IsOptional()
  currency?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'johndoe@example.com', description: 'Username or Email of the user' })
  @IsString()
  @IsNotEmpty()
  usernameOrEmail!: string;

  @ApiProperty({ example: 'password123', description: 'Password of the user' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
