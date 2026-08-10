import 'dotenv/config';
import { db } from '../config/db.js';
import { users } from '../db/schema/users.js';
import { eq } from 'drizzle-orm';

async function main() {
  const adminUser = await db.select().from(users).where(eq(users.email, 'admin@yems.local')).limit(1);
  const studentUser = await db.select().from(users).where(eq(users.email, 'student@yems.local')).limit(1);
  
  console.log('Admin user:', JSON.stringify({ id: adminUser[0]?.id, email: adminUser[0]?.email, role: adminUser[0]?.role, pwHash: adminUser[0]?.password?.substring(0, 30) + '...' }));
  console.log('Student user:', JSON.stringify({ id: studentUser[0]?.id, email: studentUser[0]?.email, role: studentUser[0]?.role, pwHash: studentUser[0]?.password?.substring(0, 30) + '...' }));
  
  // Test compare
  const { comparePassword } = await import('../shared/utils/auth.utils.js');
  
  if (adminUser[0]) {
    try {
      const match = await comparePassword('admin', adminUser[0].password);
      console.log('Admin password "admin" matches:', match);
    } catch (e) {
      console.log('Admin compare error:', (e as Error).message);
    }
  }
  
  if (studentUser[0]) {
    try {
      const match = await comparePassword('student', studentUser[0].password);
      console.log('Student password "student" matches:', match);
    } catch (e) {
      console.log('Student compare error:', (e as Error).message);
    }
  }
  
  process.exit(0);
}

main();
