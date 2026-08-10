import 'dotenv/config';
import { and, eq, or } from 'drizzle-orm';
import { db } from '../config/db.js';
import { classes, exams, users } from '../db/schema/index.js';
import { generateId } from '../shared/utils/auth.utils.js';

const questions = [
  ['Choose the correct pronoun: ___ is a good student.', ['Him', 'Her', 'She', 'Them'], 2],
  ['What is the plural of “child”?', ['Childs', 'Childen', 'Children', 'Childes'], 2],
  ['Identify the verb: “The boy runs fast.”', ['Boy', 'Runs', 'Fast', 'The'], 1],
  ['Which word is a noun?', ['Run', 'Beautiful', 'Table', 'Quickly'], 2],
  ['What is the past tense of “go”?', ['Goed', 'Went', 'Gone', 'Going'], 1],
  ['Choose the correct article: I saw ___ apple.', ['A', 'An', 'The', 'This'], 1],
  ['What type of sentence is “Close the door!”?', ['Declarative', 'Interrogative', 'Imperative', 'Exclamatory'], 2],
  ['What is a synonym of “happy”?', ['Sad', 'Angry', 'Glad', 'Tired'], 2],
  ['Which word is an adjective?', ['Run', 'Beautiful', 'Quickly', 'And'], 1],
  ['What is the opposite of “hot”?', ['Warm', 'Cool', 'Cold', 'Mild'], 2],
].map(([text, options, correctIndex], index) => ({
  id: `js1-eng-midterm-${index + 1}`,
  text: text as string,
  options: options as string[],
  points: 1,
  correctIndex: correctIndex as number,
}));

function isJs1(level: string): boolean {
  return /^(JS|JSS)\s*1$/i.test(level.trim()) || /^(JS|JSS)1$/i.test(level.trim());
}

function normalizeStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  if (typeof value !== 'string' || value.trim() === '') return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string');
    }
  } catch {
    // Legacy rows may contain comma-separated text instead of JSON.
  }

  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

async function main() {
  const js1Classes = await db.select().from(classes);
  const targets = js1Classes.filter((schoolClass) => isJs1(schoolClass.level) || isJs1(schoolClass.displayName.split(' - ')[0]));
  if (targets.length === 0) throw new Error('No JS1/JSS1 classes found. Seed or create classes first.');

  const teachers = await db.select().from(users).where(eq(users.role, 'teacher'));
  const teacher = teachers.find((item) =>
    normalizeStringList(item.assignedSubjects).some((subject) => subject.toLowerCase() === 'english language')
  ) ?? teachers[0];
  if (!teacher) throw new Error('No teacher account found to own the examinations.');

  for (const schoolClass of targets) {
    const title = `English Language Examination - ${schoolClass.displayName}`;
    const legacyTitle = `English Language Mid-Term Examination - ${schoolClass.displayName}`;
    const existing = await db.select({ id: exams.id }).from(exams).where(and(
      eq(exams.class, schoolClass.displayName),
      or(eq(exams.title, title), eq(exams.title, legacyTitle)),
    )).limit(1);
    if (existing.length > 0) {
      await db.update(exams).set({ title, desc: '10-question English Language examination for JS1.', status: 'active', type: 'final', format: 'mcq', subject: 'English Language', questions, questionsList: questions, questionsCount: questions.length, updatedAt: new Date() }).where(eq(exams.id, existing[0].id));
      console.log(`Activated existing exam for ${schoolClass.displayName}`);
      continue;
    }
    await db.insert(exams).values({ id: generateId(), title, desc: '10-question English Language examination for JS1.', type: 'final', format: 'mcq', subject: 'English Language', class: schoolClass.displayName, status: 'active', showResults: true, duration: 30, passingScore: 50, questions, questionsList: questions, questionsCount: questions.length, createdBy: teacher.id });
    console.log(`Created active exam for ${schoolClass.displayName}`);
  }
  console.log(`Finished ${targets.length} JS1 English Language exam(s).`);
  process.exit(0);
}

main().catch((error) => { console.error('Failed to create JS1 exams:', error); process.exit(1); });
