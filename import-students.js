#!/usr/bin/env bun

// ── Parse CLI flags before any backend module is imported ──
const useDocker = process.argv.includes('--docker');

if (useDocker) {
  // Load root .env (the one Docker Compose uses)
  const { config } = await import('dotenv');
  config({ path: './.env' });
  // Docker uses service hostnames (@postgres) which don't resolve from the host.
  // Rewrite to localhost so the script can reach the container's exposed port.
  if (process.env.DATABASE_URL?.includes('@postgres:')) {
    process.env.DATABASE_URL = process.env.DATABASE_URL.replace('@postgres:', '@localhost:');
  }
  console.log('[Docker mode] DATABASE_URL:', process.env.DATABASE_URL);
} else {
  // Load backend-local .env (local dev defaults).
  // Use override: true in case Bun auto-loaded the root .env with Docker hostnames.
  const { config } = await import('dotenv');
  config({ path: './packages/backend/.env', override: true });
}

// ── Dynamic imports so env is configured before backend modules evaluate ──
const { readFile } = await import('node:fs/promises');
const { hashPassword, generateId } = await import('./packages/backend/src/shared/utils/auth.utils.js');
const { db } = await import('./packages/backend/src/config/db.js');
const { users, admissions } = await import('./packages/backend/src/db/schema/index.js');
const { eq } = await import('drizzle-orm');

async function main() {
  if (useDocker) {
    console.log('Starting student import from students.csv (Docker mode)...');
  } else {
    console.log('Starting student import from students.csv...');
    console.log('Tip: Pass --docker to connect to the Docker Compose PostgreSQL instance.');
  }
  
  // Read CSV file
  const csvContent = await readFile('./students.csv', 'utf8');
  const lines = csvContent.trim().split('\n');
  
  // Parse header
  const headers = lines[0].split(',').map(h => h.trim());
  
  // Process each student record
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    try {
       const values = line.split(',').map(v => v.trim());
       const student = Object.fromEntries(headers.map((h, index) => [h, values[index] === '' ? null : values[index]]));
      
      // Skip if missing required fields
      if (!student.FirstName || !student.LastName) {
        console.warn(`Skipping row ${i + 1}: Missing firstName or lastName`);
        errorCount++;
        continue;
      }
      
       // Check if user already exists by email
       if (student.Email) {
         const existingUsers = await db.select().from(users).where(eq(users.email, student.Email)).limit(1);
         const existingUser = existingUsers[0];
         
         if (existingUser) {
           console.info(`User already exists with email ${student.Email}, skipping...`);
           errorCount++;
           continue;
         }
       }
      
      // Create admission record
      const admissionId = generateId();
      const admissionData = {
        id: admissionId,
        firstName: student.FirstName,
        lastName: student.LastName,
        email: student.Email || null,
        phone: student.Phone === '' || student.Phone === 'Unknown' ? null : student.Phone,
        dateOfBirth: student.DOB === '' || student.DOB === 'Unknown' ? null : student.DOB,
        gender: student.Gender === '' || student.Gender === 'Unknown' ? null : student.Gender,
        class: student.Class || null,
        parentName: student.parentName === '' || student.parentName === 'Unknown' ? null : student.parentName,
        parentPhone: student.parentPhone === '' || student.parentPhone === 'Unknown' ? null : student.parentPhone,
        session: '2024/2025', // Default session
        status: 'pending'
      };
      
      await db.insert(admissions).values(admissionData);
      
      // Create user account with encrypted password from CSV
      const userId = generateId();
      const hashedPassword = await hashPassword(student.Password || 'changeme123');
      
      const userData = {
        id: userId,
        name: `${student.FirstName} ${student.LastName}`,
        email: student.Email || null,
        password: hashedPassword,
        role: 'student',
        studentId: student.id || null, // CSV ID
        class: student.Class ? student.Class.substring(0, 20) : null, // Truncate to 20 chars
        session: '2024/2025',
        sex: student.Gender || null,
        admissionNo: student.id || null // Using CSV ID as admission number
      };
      
      // Remove null values to use defaults where appropriate
      const cleanUserData = Object.fromEntries(
        Object.entries(userData).filter(([_, v]) => v !== null)
      );
      
      await db.insert(users).values(cleanUserData);
      
      console.log(`Created student: ${student.FirstName} ${student.LastName} (${student.Email || 'no email'})`);
      successCount++;
      
     } catch (error) {
       console.error(`Error processing row ${i + 1}:`, error);
       console.error('Error details:', JSON.stringify(error, null, 2));
       errorCount++;
       // Continue with next record as requested
     }
  }
  
  console.log(`\nImport complete!`);
  console.log(`Successfully imported: ${successCount} students`);
  console.log(`Errors/skipped: ${errorCount} students`);
}

main().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});