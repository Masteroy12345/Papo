import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTokenDto } from './dto/tokens.dto';

@Injectable()
export class TokensService {
  constructor(private readonly prisma: PrismaService) {}

  // Auto-seeds default tokens on first retrieve
  async getTokens() {
    let tokens = await this.prisma.token.findMany();
    if (tokens.length === 0) {
      await this.prisma.token.createMany({
        data: [
          { name: 'PayPoint Token', symbol: 'PAPO', decimals: 8, mintAddress: '0x21175654316719ab8cd8f92110c710db441f92ba' },
          { name: 'Bitcoin', symbol: 'BTC', decimals: 8, mintAddress: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599' },
          { name: 'Ethereum', symbol: 'ETH', decimals: 18, mintAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' },
        ],
      });
      tokens = await this.prisma.token.findMany();
    }
    return tokens;
  }

  async getTokenById(tokenId: number) {
    const token = await this.prisma.token.findUnique({
      where: { tokenId },
    });
    if (!token) {
      throw new NotFoundException(`Token with ID ${tokenId} not found`);
    }
    return token;
  }

  async createToken(createTokenDto: CreateTokenDto) {
    return this.prisma.token.create({
      data: createTokenDto,
    });
  }
}
