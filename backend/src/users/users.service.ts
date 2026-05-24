import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KycService } from '../kyc/kyc.service';
import { UpdateUserDto, UploadKycDto } from './dto/users.dto';
import { KycStatus } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kycService: KycService,
  ) {}

  async getMe(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { userId },
      include: {
        wallets: {
          select: {
            walletId: true,
            address: true,
            balance: true,
            currency: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { hash, keyEnc, ...profile } = user;
    return profile;
  }

  async updateMe(userId: number, updateDto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { userId },
      data: updateDto,
    });

    const { hash, keyEnc, ...profile } = updatedUser;
    return profile;
  }

  async startKyc(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.kycStatus === KycStatus.VERIFIED) {
      throw new BadRequestException('KYC is already verified');
    }

    const updatedUser = await this.prisma.user.update({
      where: { userId },
      data: { kycStatus: KycStatus.PENDING },
    });

    return {
      message: 'KYC process started. Please upload your identity documents.',
      status: updatedUser.kycStatus,
    };
  }

  async uploadKyc(userId: number, uploadDto: UploadKycDto) {
    const user = await this.prisma.user.findUnique({
      where: { userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Set user status to PENDING and trigger background mock validation
    await this.prisma.user.update({
      where: { userId },
      data: { kycStatus: KycStatus.PENDING },
    });

    // Run mock background validation
    await this.kycService.processKyc(userId, uploadDto.documentUrl);

    return {
      message: 'KYC documents uploaded successfully. Verification in progress.',
      status: KycStatus.PENDING,
    };
  }

  async registerBiometrics(userId: number, biometricsKey: string) {
    const user = await this.prisma.user.findUnique({
      where: { userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Biometrics key registration logged and returned successfully (stubbed)
    return {
      message: 'Biometrics registered successfully',
      biometricsKey: biometricsKey.substring(0, 8) + '...',
    };
  }
}
