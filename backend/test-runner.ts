import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');

function run() {
  console.log('🔄 Swapping Prisma provider to sqlite for local tests...');
  const originalSchema = fs.readFileSync(schemaPath, 'utf-8');
  const sqliteSchema = originalSchema.replace('provider = "postgresql"', 'provider = "sqlite"');
  fs.writeFileSync(schemaPath, sqliteSchema);

  try {
    console.log('⚙️ Regenerating Prisma Client for SQLite...');
    execSync('npx prisma generate', { stdio: 'inherit', cwd: __dirname });

    console.log('⚡ Running verification script...');
    // Ensure DATABASE_URL is SQLite for the child process too
    execSync('npx ts-node verify-backend.ts', { 
      stdio: 'inherit', 
      cwd: __dirname,
      env: { ...process.env, DATABASE_URL: 'file:./dev.db' }
    });
    console.log('✅ Verification script completed.');
  } catch (error: any) {
    console.error('❌ Test execution failed:', error.message);
  } finally {
    console.log('🔄 Reverting Prisma provider back to postgresql...');
    fs.writeFileSync(schemaPath, originalSchema);
    console.log('⚙️ Regenerating Prisma Client for PostgreSQL...');
    execSync('npx prisma generate', { stdio: 'inherit', cwd: __dirname });
    console.log('✅ Revert complete.');
  }
}

run();
