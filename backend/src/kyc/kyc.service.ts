import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KycStatus } from '@prisma/client';

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);

  constructor(private readonly prisma: PrismaService) {}

  async processKyc(userId: number, documentUrl: string): Promise<void> {
    this.logger.log(`Starting mock KYC verification for user ID ${userId} with document ${documentUrl}`);
    
    // Simulate asynchronous OCR processing and verification callback
    setTimeout(async () => {
      try {
        await this.prisma.user.update({
          where: { userId },
          data: { kycStatus: KycStatus.VERIFIED },
        });
        this.logger.log(`User ID ${userId} KYC successfully VERIFIED by third-party callback`);
      } catch (error) {
        this.logger.error(`Failed to process async KYC for user ID ${userId}: ${error.message}`);
      }
    }, 2000);
  }
}
