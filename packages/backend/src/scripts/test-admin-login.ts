import 'dotenv/config';
import { db } from '../config/db.js';
import { users } from '../db/schema/users.js';
import { refreshTokens } from '../db/schema/refresh-tokens.js';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

async function main() {
  try {
    console.log('Step 1: Find admin user...');
    const [user] = await db.select().from(users).where(eq(users.email, 'admin@yems.local')).limit(1);
    console.log('User found:', user?.id, user?.email, user?.role);
    
    if (!user) {
      console.log('ERROR: User not found');
      process.exit(1);
    }
    
    console.log('Step 2: Generate tokens...');
    const accessToken = jwt.sign(
      { sub: user.id, email: user.email, name: user.name, role: user.role },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN as any }
    );
    console.log('Access token generated:', accessToken.substring(0, 30) + '...');
    
    const refreshToken = jwt.sign(
      { sub: user.id },
      env.JWT_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN as any }
    );
    console.log('Refresh token generated');
    
    console.log('Step 3: Store refresh token...');
    const id = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.insert(refreshTokens).values({
      id,
      userId: user.id,
      token: refreshToken,
      expiresAt,
    });
    console.log('Refresh token stored with id:', id);
    
    console.log('Step 4: Destructure user...');
    const { password: _password, ...userData } = user;
    console.log('User data keys:', Object.keys(userData));
    console.log('User data:', JSON.stringify(userData, null, 2));
    
    console.log('\nSUCCESS: Admin login would work!');
  } catch (err) {
    console.log('ERROR:', (err as Error).message);
    console.log('Stack:', (err as Error).stack);
    console.log('Constructor:', (err as any)?.constructor?.name);
    console.log('Full error:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
  }
  
  process.exit(0);
}

main();
