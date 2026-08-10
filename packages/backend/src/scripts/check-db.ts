import 'dotenv/config';
import { db } from '../config/db.js';
import { users } from '../db/schema/users.js';
import { classes } from '../db/schema/classes.js';

async function main() {
  const allCls = await db.select().from(classes);
  console.log('Classes in DB:', allCls.map(c => ({ id: c.id, level: c.level, stream: c.stream, displayName: c.displayName })));

  const allStudents = await db.select().from(users);
  const studentClasses = allStudents.map(s => s.class).filter(Boolean);
  const uniqueStudentClasses = Array.from(new Set(studentClasses));
  console.log('Unique Student Classes in DB:', uniqueStudentClasses);
  
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
