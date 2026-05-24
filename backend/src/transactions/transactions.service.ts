import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { SendTransactionDto, OfflineInitDto, OfflineConfirmDto, OfflineSyncDto } from './dto/transactions.dto';
import { Prisma, TransactionStatus } from '@prisma/client';
import { ethers } from 'ethers';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly blockchain: BlockchainService,
  ) {}

  // Executes an online transaction
  async sendTransaction(userId: number, dto: SendTransactionDto) {
    const { walletFrom, walletToAddress, tokenId, amount } = dto;

    const senderWallet = await this.prisma.wallet.findUnique({
      where: { walletId: walletFrom },
    });

    if (!senderWallet) {
      throw new NotFoundException('Sender wallet not found');
    }

    if (senderWallet.userId !== userId) {
      throw new ForbiddenException('You do not own this wallet');
    }

    const recipientWallet = await this.prisma.wallet.findUnique({
      where: { address: walletToAddress },
    });

    if (!recipientWallet) {
      throw new NotFoundException(`Recipient wallet with address ${walletToAddress} not found`);
    }

    const token = await this.prisma.token.findUnique({
      where: { tokenId },
    });

    if (!token) {
      throw new NotFoundException('Token not found');
    }

    const amountDec = new Prisma.Decimal(amount);
    const feeDec = new Prisma.Decimal(0.01); // Simulated transaction fee
    const totalDeduction = amountDec.add(feeDec);

    if (senderWallet.balance.lt(totalDeduction)) {
      throw new BadRequestException('Insufficient balance to cover transfer and fee');
    }

    // Generate online transaction signature (system generated)
    const mockHash = ethers.keccak256(
      ethers.toUtf8Bytes(`${senderWallet.address}:${recipientWallet.address}:${amountDec.toString()}:${Date.now()}`)
    );

    // Atomically execute balance transfers and transaction creation
    const transaction = await this.prisma.$transaction(async (tx) => {
      // Deduct sender balance
      await tx.wallet.update({
        where: { walletId: senderWallet.walletId },
        data: { balance: { decrement: totalDeduction } },
      });

      // Credit recipient balance
      await tx.wallet.update({
        where: { walletId: recipientWallet.walletId },
        data: { balance: { increment: amountDec } },
      });

      // Create transaction log
      return tx.transaction.create({
        data: {
          walletFrom: senderWallet.walletId,
          walletTo: recipientWallet.walletId,
          tokenId: token.tokenId,
          amount: amountDec,
          fee: feeDec,
          signature: mockHash,
          status: TransactionStatus.COMPLETED,
          confirmedAt: new Date(),
        },
      });
    });

    // Anchor to blockchain asynchronously
    this.blockchain.anchorTransaction(transaction.transactionId, transaction.signature).catch((err) => {
      this.logger.error(`Failed to anchor transaction ${transaction.transactionId}: ${err.message}`);
    });

    return {
      message: 'Transaction sent successfully',
      transaction,
    };
  }

  // Pre-authorizes an offline transaction on the server side
  async initOfflineTransaction(userId: number, dto: OfflineInitDto) {
    const { walletFrom, walletToAddress, tokenId, amount } = dto;

    const senderWallet = await this.prisma.wallet.findUnique({
      where: { walletId: walletFrom },
    });

    if (!senderWallet) {
      throw new NotFoundException('Sender wallet not found');
    }

    if (senderWallet.userId !== userId) {
      throw new ForbiddenException('You do not own this wallet');
    }

    const recipientWallet = await this.prisma.wallet.findUnique({
      where: { address: walletToAddress },
    });

    if (!recipientWallet) {
      throw new NotFoundException(`Recipient wallet with address ${walletToAddress} not found`);
    }

    const amountDec = new Prisma.Decimal(amount);
    if (senderWallet.balance.lt(amountDec)) {
      throw new BadRequestException('Insufficient balance for offline pre-authorization');
    }

    const transaction = await this.prisma.transaction.create({
      data: {
        walletFrom: senderWallet.walletId,
        walletTo: recipientWallet.walletId,
        tokenId,
        amount: amountDec,
        signature: 'PRE_AUTHORIZED_BY_SERVER',
        status: TransactionStatus.OFFLINE_PENDING,
      },
    });

    // Construct the standard message payload the sender needs to sign offline
    const messageToSign = `${senderWallet.address.toLowerCase()}:${recipientWallet.address.toLowerCase()}:${amountDec.toString()}:${tokenId}:${transaction.transactionId}`;

    return {
      message: 'Offline transaction initiated successfully. Sign the message payload on the device.',
      transactionId: transaction.transactionId,
      messageToSign,
    };
  }

  // Recipient confirms receiving the signed transaction payload offline
  async confirmOfflineTransaction(userId: number, dto: OfflineConfirmDto) {
    const { transactionId, signature } = dto;

    const transaction = await this.prisma.transaction.findUnique({
      where: { transactionId },
      include: {
        receiver: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.status !== TransactionStatus.OFFLINE_PENDING) {
      throw new BadRequestException(`Transaction is in status ${transaction.status}, cannot confirm.`);
    }

    // Verify the recipient is the connected user who claims the transaction
    if (transaction.receiver.userId !== userId) {
      throw new ForbiddenException('You are not the recipient of this transaction');
    }

    const updated = await this.prisma.transaction.update({
      where: { transactionId },
      data: {
        signature,
        status: TransactionStatus.OFFLINE_CONFIRMED,
      },
    });

    return {
      message: 'Offline transaction confirmed by recipient. Awaiting network sync.',
      transaction: updated,
    };
  }

  // Syncs confirmed offline transactions, checking for double-spends and verifying cryptographic signatures
  async syncOfflineTransactions(userId: number, dto: OfflineSyncDto) {
    const { transactionIds } = dto;
    const results = [];

    for (const transactionId of transactionIds) {
      try {
        const transaction = await this.prisma.transaction.findUnique({
          where: { transactionId },
          include: {
            sender: true,
            receiver: true,
          },
        });

        if (!transaction) {
          results.push({ transactionId, success: false, error: 'Transaction not found' });
          continue;
        }

        // If already completed, skip (idempotency)
        if (transaction.status === TransactionStatus.COMPLETED) {
          results.push({ transactionId, success: true, message: 'Already synchronized' });
          continue;
        }

        if (transaction.status !== TransactionStatus.OFFLINE_CONFIRMED) {
          results.push({
            transactionId,
            success: false,
            error: `Transaction status is ${transaction.status}, must be OFFLINE_CONFIRMED to sync`,
          });
          continue;
        }

        // 1. Verify Cryptographic Signature
        // The message structure: "sender_address:receiver_address:amount:token_id:transaction_id"
        const message = `${transaction.sender.address.toLowerCase()}:${transaction.receiver.address.toLowerCase()}:${transaction.amount.toString()}:${transaction.tokenId}:${transaction.transactionId}`;
        
        const isSignatureValid = this.blockchain.verifySignature(
          transaction.sender.address,
          message,
          transaction.signature,
        );

        if (!isSignatureValid) {
          await this.prisma.transaction.update({
            where: { transactionId },
            data: { status: TransactionStatus.FAILED },
          });
          results.push({ transactionId, success: false, error: 'Invalid signature verification' });
          continue;
        }

        // 2. Double-Spend check (verify sender balance)
        const senderWallet = await this.prisma.wallet.findUnique({
          where: { walletId: transaction.walletFrom },
        });

        if (!senderWallet || senderWallet.balance.lt(transaction.amount)) {
          await this.prisma.transaction.update({
            where: { transactionId },
            data: { status: TransactionStatus.FAILED },
          });
          results.push({ transactionId, success: false, error: 'Insufficient balance (double-spend protection)' });
          continue;
        }

        // 3. Atomically update balances and complete transaction
        const completedTx = await this.prisma.$transaction(async (tx) => {
          await tx.wallet.update({
            where: { walletId: transaction.walletFrom },
            data: { balance: { decrement: transaction.amount } },
          });

          await tx.wallet.update({
            where: { walletId: transaction.walletTo },
            data: { balance: { increment: transaction.amount } },
          });

          return tx.transaction.update({
            where: { transactionId },
            data: {
              status: TransactionStatus.COMPLETED,
              confirmedAt: new Date(),
            },
          });
        });

        // 4. Anchor to blockchain
        this.blockchain.anchorTransaction(completedTx.transactionId, completedTx.signature).catch((err) => {
          this.logger.error(`Failed to anchor synchronized transaction ${completedTx.transactionId}: ${err.message}`);
        });

        results.push({ transactionId, success: true, transaction: completedTx });
      } catch (err) {
        this.logger.error(`Sync error on transaction ${transactionId}: ${err.message}`);
        results.push({ transactionId, success: false, error: err.message });
      }
    }

    return {
      message: 'Offline synchronization completed',
      results,
    };
  }

  async getTransactions(userId: number) {
    return this.prisma.transaction.findMany({
      where: {
        OR: [
          { sender: { userId } },
          { receiver: { userId } },
        ],
      },
      include: {
        sender: {
          select: { address: true, currency: true },
        },
        receiver: {
          select: { address: true, currency: true },
        },
        token: {
          select: { symbol: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTransactionById(userId: number, transactionId: number) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { transactionId },
      include: {
        sender: true,
        receiver: true,
        token: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.sender.userId !== userId && transaction.receiver.userId !== userId) {
      throw new ForbiddenException('You are not authorized to view this transaction');
    }

    return transaction;
  }
}
