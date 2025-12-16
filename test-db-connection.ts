#!/usr/bin/env tsx

/**
 * Test database connection before running migrations
 * Usage: tsx test-db-connection.ts
 */

import { PrismaClient } from '@prisma/client';

async function testConnection() {
  const dbUrl = process.env.DATABASE_URL;

  console.log('🔍 Testing database connection...');
  console.log('Database URL:', dbUrl?.replace(/:[^:@]+@/, ':****@')); // Hide password

  const prisma = new PrismaClient({
    log: ['error', 'warn'],
  });

  try {
    // Simple query to test connection
    await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database connection successful!');

    // Test if we can query schema
    const tables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;

    console.log('\n📋 Existing tables:', tables);

    if (Array.isArray(tables) && tables.length === 0) {
      console.log('⚠️  No tables found - migrations need to be run');
    }

  } catch (error) {
    console.error('❌ Database connection failed:');
    if (error instanceof Error) {
      console.error('Error:', error.message);

      // Provide helpful tips
      if (error.message.includes('timeout') || error.message.includes("Can't reach")) {
        console.log('\n💡 Troubleshooting tips:');
        console.log('1. Check if Supabase project is fully initialized (takes 2-3 min)');
        console.log('2. Verify the connection string is correct');
        console.log('3. Make sure you replaced [YOUR-PASSWORD] with actual password');
        console.log('4. Try using Direct Connection instead of Pooler');
        console.log('5. Check if your IP is whitelisted (Supabase: Database → Connection Pooling → Settings)');
      }
    } else {
      console.error(error);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
