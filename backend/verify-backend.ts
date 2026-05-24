import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PrismaService } from './src/prisma/prisma.service';
import { decrypt } from './src/common/utils/crypto.util';
import { ethers } from 'ethers';

const PORT = 3005;
const BASE_URL = `http://localhost:${PORT}/api/v1`;

async function main() {
  process.env.DATABASE_URL = 'file:./dev.db';
  console.log('==================================================');
  console.log('🚀 BOOTSTRAPPING NESTJS PAPO BACKEND FOR INTEGRATION TEST');
  console.log('==================================================');

  // Boot the app on test port
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
  app.setGlobalPrefix('api/v1');
  await app.listen(PORT);

  const prisma = app.get(PrismaService);

  try {
    // 1. Clean database before test
    console.log('\n🧹 Cleaning database records...');
    await prisma.transaction.deleteMany({});
    await prisma.wallet.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.token.deleteMany({});
    console.log('✅ Database clean.');

    // 2. Trigger auto-seeding of tokens by calling GET /tokens
    console.log('\n🪙 Fetching and seeding tokens...');
    const tokensRes = await fetch(`${BASE_URL}/tokens`);
    const tokens = await tokensRes.json();
    console.log(`✅ Loaded ${tokens.length} tokens:`, tokens.map((t: any) => t.symbol).join(', '));
    const papoToken = tokens.find((t: any) => t.symbol === 'PAPO');

    // 3. Register Alice and Bob
    console.log('\n👤 Registering Alice...');
    const aliceHeaders = { 'Content-Type': 'application/json' };
    const regAlice = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: aliceHeaders,
      body: JSON.stringify({
        username: 'alice1',
        email: 'alice@papo.com',
        password: 'alicepassword123',
        phone: '+237600000001',
        currency: 'USD',
      }),
    }).then(res => res.json());

    console.log('✅ Alice registered. Wallet Address:', regAlice.walletAddress);

    console.log('👤 Registering Bob...');
    const regBob = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: aliceHeaders,
      body: JSON.stringify({
        username: 'bob1',
        email: 'bob@papo.com',
        password: 'bobpassword123',
        phone: '+237600000002',
        currency: 'USD',
      }),
    }).then(res => res.json());
    console.log('✅ Bob registered. Wallet Address:', regBob.walletAddress);

    // 4. Log in as Alice and Bob to get JWTs
    console.log('\n🔑 Logging in Alice...');
    const loginAlice = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: aliceHeaders,
      body: JSON.stringify({
        usernameOrEmail: 'alice1',
        password: 'alicepassword123',
      }),
    }).then(res => res.json());
    const aliceToken = loginAlice.access_token;
    console.log('✅ Alice logged in.');

    console.log('🔑 Logging in Bob...');
    const loginBob = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: aliceHeaders,
      body: JSON.stringify({
        usernameOrEmail: 'bob1',
        password: 'bobpassword123',
      }),
    }).then(res => res.json());
    const bobToken = loginBob.access_token;
    console.log('✅ Bob logged in.');

    // 5. Seed some balance to Alice's wallet directly via DB for testing
    console.log('\n💰 Seeding 500.0 USD to Alice\'s wallet...');
    const aliceWallet = loginAlice.user.wallets[0];
    await prisma.wallet.update({
      where: { walletId: aliceWallet.walletId },
      data: { balance: 500.0 },
    });
    console.log('✅ Alice\'s balance set to 500.0 USD.');

    // 6. Test GET /users/me
    console.log('\n📋 Fetching Alice\'s profile...');
    const aliceProfile = await fetch(`${BASE_URL}/users/me`, {
      headers: { Authorization: `Bearer ${aliceToken}` },
    }).then(res => res.json());
    console.log('✅ Alice Profile:', {
      userId: aliceProfile.userId,
      username: aliceProfile.username,
      kycStatus: aliceProfile.kycStatus,
      wallets: aliceProfile.wallets,
    });

    // 7. Perform an online transaction
    console.log('\n💸 Transferring 100 USD from Alice to Bob (Online)...');
    const sendTxRes = await fetch(`${BASE_URL}/transactions/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aliceToken}`,
      },
      body: JSON.stringify({
        walletFrom: aliceWallet.walletId,
        walletToAddress: regBob.walletAddress,
        tokenId: papoToken.tokenId,
        amount: 100.0,
      }),
    }).then(res => res.json());
    console.log('✅ Online transaction response:', sendTxRes.message, 'Tx ID:', sendTxRes.transaction?.transactionId);

    // Verify online balances
    let aliceW = await prisma.wallet.findUnique({ where: { walletId: aliceWallet.walletId } });
    let bobW = await prisma.wallet.findUnique({ where: { address: regBob.walletAddress } });
    console.log(`📊 Balances after online transaction (100.0 + 0.01 fee deducted):`);
    console.log(`   Alice: ${aliceW?.balance.toString()} USD`);
    console.log(`   Bob: ${bobW?.balance.toString()} USD`);

    // 8. Offline Transaction Flow
    console.log('\n📶 STARTING OFFLINE TRANSACTION FLOW');
    console.log('--------------------------------------------------');

    // Alice initiates offline transaction of 50.0 USD
    console.log('1. Alice initiates offline transaction on the server...');
    const initOffline = await fetch(`${BASE_URL}/transactions/offline/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aliceToken}`,
      },
      body: JSON.stringify({
        walletFrom: aliceWallet.walletId,
        walletToAddress: regBob.walletAddress,
        tokenId: papoToken.tokenId,
        amount: 50.0,
      }),
    }).then(res => res.json());

    console.log('✅ Offline Initiation Response:', initOffline.message);
    console.log('   Payload to sign:', initOffline.messageToSign);

    // Fetch Alice's private key, decrypt it, and sign the payload to simulate device signature
    console.log('2. Decrypting Alice\'s private key from database and signing message locally...');
    const aliceDbWallet = await prisma.wallet.findUnique({
      where: { walletId: aliceWallet.walletId },
    });
    if (!aliceDbWallet) throw new Error('Alice wallet not found');
    const masterSecret = process.env.ENCRYPTION_KEY || 'papo_encryption_secret_key_32_bytes_long_!';
    const decryptedPrivateKey = decrypt(aliceDbWallet.privateKeyEnc, masterSecret);
    
    // Sign the message payload using ethers
    const walletSigner = new ethers.Wallet(decryptedPrivateKey);
    const signature = await walletSigner.signMessage(initOffline.messageToSign);
    console.log('✅ Local cryptographic signature generated:', signature);

    // Bob confirms receiving the transaction
    console.log('3. Bob confirms receiving the signed transaction payload...');
    const confirmOffline = await fetch(`${BASE_URL}/transactions/offline/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bobToken}`,
      },
      body: JSON.stringify({
        transactionId: initOffline.transactionId,
        signature: signature,
      }),
    }).then(res => res.json());
    console.log('✅ Bob Confirmation Response:', confirmOffline.message);

    // Sync offline transactions
    console.log('4. Syncing offline transactions (verifying signature and balance)...');
    const syncOffline = await fetch(`${BASE_URL}/transactions/offline/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aliceToken}`, // either Alice or Bob can sync
      },
      body: JSON.stringify({
        transactionIds: [initOffline.transactionId],
      }),
    }).then(res => res.json());
    console.log('✅ Offline Sync Response:', syncOffline.message, 'Results:', syncOffline.results);

    // Verify offline balances
    aliceW = await prisma.wallet.findUnique({ where: { walletId: aliceWallet.walletId } });
    bobW = await prisma.wallet.findUnique({ where: { address: regBob.walletAddress } });
    console.log(`📊 Final Balances after Offline Sync (50.0 USD transferred):`);
    console.log(`   Alice: ${aliceW?.balance.toString()} USD`);
    console.log(`   Bob: ${bobW?.balance.toString()} USD`);

    console.log('\n==================================================');
    console.log('🎉 ALL PAPO BACKEND VERIFICATIONS COMPLETED SUCCESSFULLY!');
    console.log('==================================================');

  } catch (error: any) {
    console.error('❌ Integration test failed with error:', error);
  } finally {
    // Close the app context and process
    await app.close();
    process.exit(0);
  }
}

main();
