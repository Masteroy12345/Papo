import { Controller, Post, Get, Body, Param, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WalletsService } from './wallets.service';
import { CreateWalletDto } from './dto/wallets.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('wallets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new wallet for the current user' })
  @ApiResponse({ status: 201, description: 'Wallet successfully created.' })
  async createWallet(@Req() req: any, @Body() createWalletDto: CreateWalletDto) {
    return this.walletsService.createWallet(req.user.userId, createWalletDto);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve all wallets for the current user' })
  @ApiResponse({ status: 200, description: 'List of wallets retrieved successfully.' })
  async getWallets(@Req() req: any) {
    return this.walletsService.getWallets(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve wallet details by ID' })
  @ApiResponse({ status: 200, description: 'Wallet details retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'Wallet not found.' })
  async getWalletById(@Req() req: any, @Param('id', ParseIntPipe) walletId: number) {
    return this.walletsService.getWalletById(req.user.userId, walletId);
  }

  @Get(':id/balance')
  @ApiOperation({ summary: 'Retrieve wallet balance' })
  @ApiResponse({ status: 200, description: 'Wallet balance retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'Wallet not found.' })
  async getBalance(@Req() req: any, @Param('id', ParseIntPipe) walletId: number) {
    return this.walletsService.getBalance(req.user.userId, walletId);
  }
}
