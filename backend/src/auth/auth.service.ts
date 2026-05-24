import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';
import { encrypt } from '../common/utils/crypto.util';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blockchain: BlockchainService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { username, email, password, phone, currency } = registerDto;

    // Check if user exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      throw new ConflictException('Username or Email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const masterSecret = process.env.ENCRYPTION_KEY || 'papo_encryption_secret_key_32_bytes_long_!';
    const userKeyEnc = encrypt(password, masterSecret);

    // Generate blockchain keypair
    const generated = this.blockchain.generateWallet();
    const encryptedPrivateKey = encrypt(generated.privateKey, masterSecret);

    // Perform database transaction
    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          username,
          email,
          phone,
          hash: passwordHash,
          keyEnc: userKeyEnc,
        },
      });

      await tx.wallet.create({
        data: {
          address: generated.address,
          userId: newUser.userId,
          publicKey: generated.publicKey,
          privateKeyEnc: encryptedPrivateKey,
          currency: currency || 'USD',
          balance: 0.0,
        },
      });

      return newUser;
    });

    const { hash, keyEnc, ...result } = user;
    return {
      message: 'User registered successfully with a default wallet',
      user: result,
      walletAddress: generated.address,
    };
  }

  async login(loginDto: LoginDto) {
    const { usernameOrEmail, password } = loginDto;

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: usernameOrEmail }, { username: usernameOrEmail }],
      },
      include: {
        wallets: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(password, user.hash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.userId,
      username: user.username,
      email: user.email,
      kycStatus: user.kycStatus,
    };

    const { hash, keyEnc, ...userProfile } = user;

    return {
      access_token: this.jwtService.sign(payload),
      user: userProfile,
    };
  }

  async refreshToken(user: any) {
    const payload = {
      sub: user.userId,
      username: user.username,
      email: user.email,
      kycStatus: user.kycStatus,
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
