import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);

  // Generates a new random EVM-compatible address and private key
  generateWallet(): { address: string; privateKey: string; publicKey: string } {
    const wallet = ethers.Wallet.createRandom();
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
      publicKey: wallet.signingKey.publicKey,
    };
  }

  // Verifies the cryptographic signature of a transaction payload
  verifySignature(
    senderAddress: string,
    message: string,
    signature: string,
  ): boolean {
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === senderAddress.toLowerCase();
    } catch (error) {
      this.logger.error(`Signature verification failed: ${error.message}`);
      return false;
    }
  }

  // Anchors transaction hash to the blockchain (simulating EVM anchoring)
  async anchorTransaction(transactionId: number, dataHash: string): Promise<string> {
    this.logger.log(`Anchoring transaction ${transactionId} with hash ${dataHash} to the blockchain...`);
    // Simulate mining latency
    await new Promise((resolve) => setTimeout(resolve, 50));
    const mockTxReceipt = ethers.keccak256(ethers.toUtf8Bytes(transactionId + dataHash + Date.now().toString()));
    this.logger.log(`Transaction successfully anchored. Receipt: ${mockTxReceipt}`);
    return mockTxReceipt;
  }
}
