import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { CreateWalletDto } from './dto/wallets.dto';
import { encrypt } from '../common/utils/crypto.util';

@Injectable()
export class WalletsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blockchain: BlockchainService,
  ) {}

  async createWallet(userId: number, createWalletDto: CreateWalletDto) {
    const { currency } = createWalletDto;
    const masterSecret = process.env.ENCRYPTION_KEY || 'papo_encryption_secret_key_32_bytes_long_!';
    
    // Generate new cryptographic keys
    const generated = this.blockchain.generateWallet();
    const encryptedPrivateKey = encrypt(generated.privateKey, masterSecret);

    const wallet = await this.prisma.wallet.create({
      data: {
        address: generated.address,
        userId: userId,
        publicKey: generated.publicKey,
        privateKeyEnc: encryptedPrivateKey,
        currency: currency || 'USD',
        balance: 0.0,
      },
    });

    // Strip privateKeyEnc from output
    const { privateKeyEnc, ...result } = wallet;
    return result;
  }

  async getWallets(userId: number) {
    return this.prisma.wallet.findMany({
      where: { userId },
      select: {
        walletId: true,
        address: true,
        currency: true,
        balance: true,
        createdAt: true,
      },
    });
  }

  async getWalletById(userId: number, walletId: number) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { walletId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    if (wallet.userId !== userId) {
      throw new ForbiddenException('You do not own this wallet');
    }

    const { privateKeyEnc, ...result } = wallet;
    return result;
  }

  async getBalance(userId: number, walletId: number) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { walletId },
      select: {
        walletId: true,
        userId: true,
        balance: true,
        currency: true,
      },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    if (wallet.userId !== userId) {
      throw new ForbiddenException('You do not own this wallet');
    }

    return {
      walletId: wallet.walletId,
      balance: wallet.balance,
      currency: wallet.currency,
    };
  }
}
