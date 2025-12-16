import { config } from 'dotenv';

// Load all env files
config({ path: '.env.local' });
config({ path: '.env' });

console.log('REDIS_URL:', process.env.REDIS_URL || 'NOT SET');
console.log('UPSTASH_REDIS_REST_URL:', process.env.UPSTASH_REDIS_REST_URL || 'NOT SET');
console.log('UPSTASH_REDIS_REST_TOKEN:', process.env.UPSTASH_REDIS_REST_TOKEN ? 'SET' : 'NOT SET');

// Now import cache to see what it uses
import { cache } from './src/lib/cache';

console.log('Cache type:', cache.constructor.name);
