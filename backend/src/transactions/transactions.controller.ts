import { Controller, Post, Get, Body, Param, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { SendTransactionDto, OfflineInitDto, OfflineConfirmDto, OfflineSyncDto } from './dto/transactions.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('send')
  @ApiOperation({ summary: 'Send funds online (standard transfer)' })
  @ApiResponse({ status: 201, description: 'Online transaction completed and logged.' })
  @ApiResponse({ status: 400, description: 'Insufficient balance or bad parameters.' })
  async sendTransaction(@Req() req: any, @Body() sendDto: SendTransactionDto) {
    return this.transactionsService.sendTransaction(req.user.userId, sendDto);
  }

  @Post('offline/init')
  @ApiOperation({ summary: 'Initiate an offline transaction' })
  @ApiResponse({ status: 201, description: 'Offline transaction record created. Message payload ready for signing.' })
  async initOfflineTransaction(@Req() req: any, @Body() initDto: OfflineInitDto) {
    return this.transactionsService.initOfflineTransaction(req.user.userId, initDto);
  }

  @Post('offline/confirm')
  @ApiOperation({ summary: 'Confirm receiving signed offline payload (recipient)' })
  @ApiResponse({ status: 201, description: 'Offline transaction confirmation status updated.' })
  async confirmOfflineTransaction(@Req() req: any, @Body() confirmDto: OfflineConfirmDto) {
    return this.transactionsService.confirmOfflineTransaction(req.user.userId, confirmDto);
  }

  @Post('offline/sync')
  @ApiOperation({ summary: 'Synchronize offline transactions with database balance changes' })
  @ApiResponse({ status: 201, description: 'Synchronization processing complete.' })
  async syncOfflineTransactions(@Req() req: any, @Body() syncDto: OfflineSyncDto) {
    return this.transactionsService.syncOfflineTransactions(req.user.userId, syncDto);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve transaction history for the current user' })
  @ApiResponse({ status: 200, description: 'List of transactions returned.' })
  async getTransactions(@Req() req: any) {
    return this.transactionsService.getTransactions(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve specific transaction details by ID' })
  @ApiResponse({ status: 200, description: 'Transaction details returned.' })
  @ApiResponse({ status: 404, description: 'Transaction not found.' })
  async getTransactionById(@Req() req: any, @Param('id', ParseIntPipe) transactionId: number) {
    return this.transactionsService.getTransactionById(req.user.userId, transactionId);
  }
}
