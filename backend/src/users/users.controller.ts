import { Controller, Get, Put, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto, StartKycDto, UploadKycDto, BiometricsDto } from './dto/users.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile details returned successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getMe(@Req() req: any) {
    return this.usersService.getMe(req.user.userId);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async updateMe(@Req() req: any, @Body() updateDto: UpdateUserDto) {
    return this.usersService.updateMe(req.user.userId, updateDto);
  }

  @Post('me/kyc/start')
  @ApiOperation({ summary: 'Initiate KYC process' })
  @ApiResponse({ status: 200, description: 'KYC registration started.' })
  @ApiResponse({ status: 400, description: 'KYC is already completed or verified.' })
  async startKyc(@Req() req: any, @Body() startDto: StartKycDto) {
    return this.usersService.startKyc(req.user.userId);
  }

  @Post('me/kyc/upload')
  @ApiOperation({ summary: 'Upload KYC documents' })
  @ApiResponse({ status: 200, description: 'Documents uploaded. KYC processing initiated.' })
  async uploadKyc(@Req() req: any, @Body() uploadDto: UploadKycDto) {
    return this.usersService.uploadKyc(req.user.userId, uploadDto);
  }

  @Post('me/biometrics')
  @ApiOperation({ summary: 'Register biometrics credentials' })
  @ApiResponse({ status: 200, description: 'Biometrics signature registered successfully.' })
  async registerBiometrics(@Req() req: any, @Body() biometricsDto: BiometricsDto) {
    return this.usersService.registerBiometrics(req.user.userId, biometricsDto.biometricsKey);
  }
}
