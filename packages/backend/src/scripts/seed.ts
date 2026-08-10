import 'dotenv/config';
import { db } from '../config/db.js';
import {
  users,
  subjects,
  lessons,
  schemes,
  lessonPlans,
  reports,
  admissions,
  bills,
  payments,
  accountSettings,
  assignments,
  exams,
  notes,
  notifications,
  submissions,
  classes,
  results,
  midtermResults,
} from '../db/schema/index.js';
import { hashPassword, generateId } from '../shared/utils/auth.utils.js';
import fs from 'fs';
import path from 'path';

const ROLE_VALUES = [
  'student',
  'teacher',
  'admin',
  'superadmin',
  'accountant',
  'technician',
  'principal',
  'hod',
  'parent',
] as const;
type Role = (typeof ROLE_VALUES)[number];

const REPORT_CATEGORY_VALUES = ['feedback', 'bug', 'suggestion', 'complaint', 'emergency'] as const;
type ReportCategory = (typeof REPORT_CATEGORY_VALUES)[number];

const ADMISSION_STATUS_VALUES = ['pending', 'approved', 'rejected'] as const;
type AdmissionStatus = (typeof ADMISSION_STATUS_VALUES)[number];

const DEFAULT_USERS: Array<{
  id: string;
  name: string;
  initials: string;
  email: string;
  password: string;
  role: Role;
  studentId?: string;
  class?: string;
  session?: string;
  term?: string;
  sex?: string;
  admissionNo?: string;
  teacherId?: string;
  adminId?: string;
  accountantId?: string;
  assignedSubjects?: string[];
  assignedClasses?: string[];
  isClassTeacher?: boolean;
  classTeacherOf?: string;
}> = [
  { id: 'T001', name: 'Teacher', initials: 'T', email: 'teacher@yems.local', password: 'teacher', role: 'teacher', teacherId: 'T001', session: '2024/2025', term: 'Second Term', assignedSubjects: ['Mathematics', 'Core Subject'], assignedClasses: ['SS3'], isClassTeacher: true, classTeacherOf: 'SS3' },
  { id: 'T002', name: 'Biology Teacher', initials: 'BT', email: 'biology@yems.local', password: 'teacher', role: 'teacher', teacherId: 'T002', session: '2024/2025', term: 'Second Term', assignedSubjects: ['Biology'], assignedClasses: ['SS2'] },
  { id: 'T003', name: 'History Teacher', initials: 'HT', email: 'history@yems.local', password: 'teacher', role: 'teacher', teacherId: 'T003', session: '2024/2025', term: 'Second Term', assignedSubjects: ['History'], assignedClasses: ['SS1'] },
  { id: 'T004', name: 'Fawehinmi Erioluwa', initials: 'FE', email: 'erioluwwa@yems.local', password: 'Erioluwa@123', role: 'teacher', teacherId: 'T004', session: '2024/2025', term: 'Second Term', assignedSubjects: ['Mathematics'], assignedClasses: ['SS3'], isClassTeacher: true, classTeacherOf: 'SS3', sex: 'Male' },
  { id: 'A001', name: 'Administrator', initials: 'AD', email: 'admin@yems.local', password: 'admin', role: 'admin', adminId: 'A001', session: '2024/2025', term: 'Second Term' },
  { id: 'SA001', name: 'Super Administrator', initials: 'SA', email: 'superadmin@yems.local', password: 'superadmin', role: 'superadmin', adminId: 'SA001', session: '2024/2025', term: 'Second Term' },
  { id: 'AC001', name: 'School Accountant', initials: 'AC', email: 'account@yems.local', password: 'account', role: 'accountant', accountantId: 'AC001', session: '2024/2025', term: 'Second Term' },
  { id: 'P001', name: 'Principal', initials: 'PR', email: 'principal@yems.local', password: 'principal', role: 'principal', adminId: 'P001', session: '2024/2025', term: 'Second Term' },
  { id: 'H001', name: 'HOD', initials: 'HO', email: 'hod@yems.local', password: 'hod', role: 'hod', adminId: 'H001', session: '2024/2025', term: 'Second Term' },
  { id: 'TECH001', name: 'System Technician', initials: 'ST', email: 'technician@yems.local', password: 'technician', role: 'technician', adminId: 'TECH001', session: '2024/2025', term: 'Second Term' },
  { id: 'PARENT001', name: 'Mrs. Adeyemi', initials: 'MA', email: 'parent@yems.local', password: 'parent', role: 'parent', studentId: 'f10bbc31-c982-41a6-8772-1983047482d4', session: '2024/2025', term: 'Second Term' },
];

const DEFAULT_SUBJECTS = [
  // Junior Subjects (no department)
  { name: 'Mathematics', code: 'MTH-J', category: 'junior' },
  { name: 'English Language', code: 'ENG-J', category: 'junior' },
  { name: 'Basic Science', code: 'BSC', category: 'junior' },
  { name: 'Basic Technology', code: 'BTE', category: 'junior' },
  { name: 'Social Studies', code: 'SOS', category: 'junior' },
  { name: 'Civic Education', code: 'CIV-J', category: 'junior' },
  { name: 'Computer Studies', code: 'CSC', category: 'junior' },
  { name: 'Home Economics', code: 'HEC', category: 'junior' },
  { name: 'French', code: 'FRN', category: 'junior' },
  { name: 'Yoruba', code: 'YOR', category: 'junior' },
  { name: 'Christian Religious Studies', code: 'CRS', category: 'junior' },
  { name: 'Islamic Religious Studies', code: 'IRS', category: 'junior' },
  { name: 'Business Studies', code: 'BST', category: 'junior' },
  { name: 'Agricultural Science', code: 'AGR-J', category: 'junior' },

  // General Senior Subjects (no department)
  { name: 'Mathematics', code: 'MTH-S', category: 'general-senior' },
  { name: 'English Language', code: 'ENG-S', category: 'general-senior' },
  { name: 'Civic Education', code: 'CIV-S', category: 'general-senior' },
  { name: 'Biology', code: 'BIO-G', category: 'general-senior' },
  { name: 'Economics', code: 'ECO-G', category: 'general-senior' },
  { name: 'Core Subject', code: 'CORE', category: 'general-senior' },

  // Senior Science Subjects
  { name: 'Physics', code: 'PHY', category: 'senior', department: 'science' },
  { name: 'Chemistry', code: 'CHM', category: 'senior', department: 'science' },
  { name: 'Further Mathematics', code: 'FMT', category: 'senior', department: 'science' },

  // Senior Art Subjects
  { name: 'Literature in English', code: 'LIT', category: 'senior', department: 'art' },
  { name: 'Government', code: 'GOV', category: 'senior', department: 'art' },
  { name: 'History', code: 'HIS', category: 'senior', department: 'art' },
  { name: 'Christian Religious Studies', code: 'CRS-S', category: 'senior', department: 'art' },

  // Senior Commercial Subjects
  { name: 'Financial Accounting', code: 'ACC', category: 'senior', department: 'commercial' },
  { name: 'Commerce', code: 'COM', category: 'senior', department: 'commercial' },
  { name: 'Office Practice', code: 'OPR', category: 'senior', department: 'commercial' },

  // Test Run Subject
  { name: 'Test Run', code: 'TR', category: 'general-senior' },
];

type ExamQuestion = { id: string; text: string; options: string[]; points: number; correctIndex: number };

const QUESTION_BANK: Record<string, { math: ExamQuestion[]; english: ExamQuestion[] }> = {
  'JSS 1': {
    math: [
      { id: 'j1m1', text: 'What is 12 + 15?', options: ['25', '27', '29', '30'], points: 1, correctIndex: 1 },
      { id: 'j1m2', text: 'What is 45 - 23?', options: ['18', '20', '22', '24'], points: 1, correctIndex: 2 },
      { id: 'j1m3', text: 'What is 8 × 7?', options: ['48', '54', '56', '63'], points: 1, correctIndex: 2 },
      { id: 'j1m4', text: 'What is 144 ÷ 12?', options: ['10', '11', '12', '14'], points: 1, correctIndex: 2 },
      { id: 'j1m5', text: 'What is 25% of 80?', options: ['15', '18', '20', '25'], points: 1, correctIndex: 2 },
      { id: 'j1m6', text: 'Convert 0.5 to a fraction', options: ['1/3', '1/2', '2/3', '3/4'], points: 1, correctIndex: 1 },
      { id: 'j1m7', text: 'What is 3² + 4²?', options: ['7', '12', '25', '49'], points: 1, correctIndex: 2 },
      { id: 'j1m8', text: 'Find x: 2x = 14', options: ['5', '6', '7', '8'], points: 1, correctIndex: 2 },
      { id: 'j1m9', text: 'What is the perimeter of a rectangle with length 5 and width 3?', options: ['8', '15', '16', '30'], points: 1, correctIndex: 2 },
      { id: 'j1m10', text: 'Which of these is a prime number?', options: ['4', '6', '7', '9'], points: 1, correctIndex: 2 },
    ],
    english: [
      { id: 'j1e1', text: 'Choose the correct pronoun: "___ is a good student"', options: ['Him', 'Her', 'She', 'Them'], points: 1, correctIndex: 2 },
      { id: 'j1e2', text: 'What is the plural of "child"?', options: ['childs', 'childen', 'children', 'childes'], points: 1, correctIndex: 2 },
      { id: 'j1e3', text: 'Identify the verb: "The boy runs fast"', options: ['boy', 'runs', 'fast', 'the'], points: 1, correctIndex: 1 },
      { id: 'j1e4', text: 'Which of these is a noun?', options: ['run', 'beautiful', 'table', 'quickly'], points: 1, correctIndex: 2 },
      { id: 'j1e5', text: 'What is the past tense of "go"?', options: ['goed', 'went', 'gone', 'going'], points: 1, correctIndex: 1 },
      { id: 'j1e6', text: 'Choose the correct article: "I saw ___ apple"', options: ['a', 'an', 'the', 'this'], points: 1, correctIndex: 1 },
      { id: 'j1e7', text: 'What type of sentence is "Close the door!"?', options: ['Declarative', 'Interrogative', 'Imperative', 'Exclamatory'], points: 1, correctIndex: 2 },
      { id: 'j1e8', text: 'What is a synonym of "happy"?', options: ['sad', 'angry', 'glad', 'tired'], points: 1, correctIndex: 2 },
      { id: 'j1e9', text: 'Which word is an adjective?', options: ['run', 'beautiful', 'quickly', 'and'], points: 1, correctIndex: 1 },
      { id: 'j1e10', text: 'What is the opposite of "hot"?', options: ['warm', 'cool', 'cold', 'mild'], points: 1, correctIndex: 2 },
    ],
  },
  'JSS 2': {
    math: [
      { id: 'j2m1', text: 'Simplify 3/4 + 1/2', options: ['4/6', '5/4', '1/4', '5/6'], points: 1, correctIndex: 1 },
      { id: 'j2m2', text: 'What is 0.75 as a fraction?', options: ['7/5', '3/4', '7/10', '75/100'], points: 1, correctIndex: 1 },
      { id: 'j2m3', text: 'Solve: 3x + 5 = 20', options: ['x = 3', 'x = 5', 'x = 7', 'x = 10'], points: 1, correctIndex: 1 },
      { id: 'j2m4', text: 'What is the area of a triangle with base 10 and height 5?', options: ['15', '25', '50', '100'], points: 1, correctIndex: 1 },
      { id: 'j2m5', text: 'What is 2³ × 3?', options: ['12', '18', '24', '48'], points: 1, correctIndex: 2 },
      { id: 'j2m6', text: 'Simplify √49', options: ['6', '7', '8', '9'], points: 1, correctIndex: 1 },
      { id: 'j2m7', text: 'If x:y = 2:3 and x = 6, find y', options: ['6', '8', '9', '12'], points: 1, correctIndex: 2 },
      { id: 'j2m8', text: 'What is 15% of 200?', options: ['15', '25', '30', '40'], points: 1, correctIndex: 2 },
      { id: 'j2m9', text: 'Convert 3/5 to a decimal', options: ['0.3', '0.5', '0.6', '0.75'], points: 1, correctIndex: 2 },
      { id: 'j2m10', text: 'Find the HCF of 12 and 18', options: ['3', '4', '6', '12'], points: 1, correctIndex: 2 },
    ],
    english: [
      { id: 'j2e1', text: 'What is the plural of "ox"?', options: ['oxs', 'oxes', 'oxen', 'oxies'], points: 1, correctIndex: 2 },
      { id: 'j2e2', text: 'Identify the adverb: "She sang beautifully"', options: ['She', 'sang', 'beautifully', 'song'], points: 1, correctIndex: 2 },
      { id: 'j2e3', text: 'What is a synonym of "enormous"?', options: ['tiny', 'small', 'huge', 'little'], points: 1, correctIndex: 2 },
      { id: 'j2e4', text: 'Which sentence is grammatically correct?', options: ['He have gone', 'He has gone', 'He had go', 'He having gone'], points: 1, correctIndex: 1 },
      { id: 'j2e5', text: 'What is the past participle of "write"?', options: ['wrote', 'written', 'writing', 'writes'], points: 1, correctIndex: 1 },
      { id: 'j2e6', text: 'What is an antonym of "brave"?', options: ['bold', 'strong', 'cowardly', 'fearless'], points: 1, correctIndex: 2 },
      { id: 'j2e7', text: 'Identify the direct object: "She kicked the ball"', options: ['She', 'kicked', 'ball', 'the'], points: 1, correctIndex: 2 },
      { id: 'j2e8', text: 'What is alliteration?', options: ['Rhyming words', 'Repetition of initial consonant sounds', 'Comparison using like', 'A type of metaphor'], points: 1, correctIndex: 1 },
      { id: 'j2e9', text: 'Which word is a conjunction?', options: ['run', 'beautiful', 'although', 'quickly'], points: 1, correctIndex: 2 },
      { id: 'j2e10', text: 'What is the correct possessive form of "dogs"?', options: ['dogs', "dog's", "dogs'", 'dogses'], points: 1, correctIndex: 2 },
    ],
  },
  'JSS 3': {
    math: [
      { id: 'j3m1', text: 'Solve: x² - 5x + 6 = 0', options: ['x=1,6', 'x=2,3', 'x=-2,-3', 'x=-1,-6'], points: 1, correctIndex: 1 },
      { id: 'j3m2', text: 'Find the gradient of y = 3x + 2', options: ['2', '3', '5', '6'], points: 1, correctIndex: 1 },
      { id: 'j3m3', text: 'Factorize: x² - 5x + 6', options: ['(x+2)(x+3)', '(x-2)(x-3)', '(x-1)(x-6)', '(x+1)(x+6)'], points: 1, correctIndex: 1 },
      { id: 'j3m4', text: 'Find the distance between (1,2) and (4,6)', options: ['3', '4', '5', '7'], points: 1, correctIndex: 2 },
      { id: 'j3m5', text: 'What is the sum of angles in a triangle?', options: ['90°', '180°', '270°', '360°'], points: 1, correctIndex: 1 },
      { id: 'j3m6', text: 'Solve: x+y=5, x-y=1', options: ['x=2,y=3', 'x=3,y=2', 'x=4,y=1', 'x=1,y=4'], points: 1, correctIndex: 1 },
      { id: 'j3m7', text: 'What is the area of a circle with radius 7? (Use π = 22/7)', options: ['44', '88', '154', '308'], points: 1, correctIndex: 2 },
      { id: 'j3m8', text: 'What is the value of sin 30°?', options: ['0.5', '0.707', '0.866', '1'], points: 1, correctIndex: 0 },
      { id: 'j3m9', text: 'If boys:girls = 3:5 and there are 24 boys, how many girls?', options: ['30', '35', '40', '45'], points: 1, correctIndex: 2 },
      { id: 'j3m10', text: 'What is the volume of a cube with side 4?', options: ['16', '32', '48', '64'], points: 1, correctIndex: 3 },
    ],
    english: [
      { id: 'j3e1', text: 'What is a metaphor?', options: ['Comparison using like/as', 'A direct comparison without like/as', 'A type of alliteration', 'An exaggeration'], points: 1, correctIndex: 1 },
      { id: 'j3e2', text: '"The wind whispered through the trees" - identify the device', options: ['Simile', 'Metaphor', 'Personification', 'Hyperbole'], points: 1, correctIndex: 2 },
      { id: 'j3e3', text: 'What is the theme of a story?', options: ['The setting', 'The main character', 'The central message', 'The plot'], points: 1, correctIndex: 2 },
      { id: 'j3e4', text: 'Which is an example of a simile?', options: ['He is a lion', 'She is as brave as a lion', 'The world is a stage', 'Time flies'], points: 1, correctIndex: 1 },
      { id: 'j3e5', text: 'What is the difference between "their" and "there"?', options: ['No difference', 'Their = possessive, there = location', 'Their = location, there = possessive', 'Both are the same'], points: 1, correctIndex: 1 },
      { id: 'j3e6', text: '"I went to the store" - what POV is this?', options: ['First person', 'Second person', 'Third person limited', 'Third person omniscient'], points: 1, correctIndex: 0 },
      { id: 'j3e7', text: 'What is foreshadowing?', options: ['A flashback', 'Clues about future events', 'A summary', 'A narrator'], points: 1, correctIndex: 1 },
      { id: 'j3e8', text: 'What is the purpose of a topic sentence?', options: ['To conclude', 'To introduce the main idea', 'To provide evidence', 'To transition'], points: 1, correctIndex: 1 },
      { id: 'j3e9', text: 'Which word is a conjunction?', options: ['running', 'although', 'beautiful', 'quickly'], points: 1, correctIndex: 1 },
      { id: 'j3e10', text: 'What is an expository essay?', options: ['A story', 'An explanation or description', 'An argument', 'A poem'], points: 1, correctIndex: 1 },
    ],
  },
  'SSS 1': {
    math: [
      { id: 's1m1', text: 'Solve: x² - 5x + 6 = 0', options: ['x=1 or 6', 'x=2 or 3', 'x=-2 or -3', 'x=-1 or -6'], points: 1, correctIndex: 1 },
      { id: 's1m2', text: 'What is log₁₀ 100?', options: ['1', '2', '10', '100'], points: 1, correctIndex: 1 },
      { id: 's1m3', text: 'If A={1,2,3,4} and B={3,4,5,6}, what is A∩B?', options: ['{1,2}', '{3,4}', '{5,6}', '{1,2,3,4,5,6}'], points: 1, correctIndex: 1 },
      { id: 's1m4', text: 'Solve: 2^(x+1) = 16', options: ['x=2', 'x=3', 'x=4', 'x=5'], points: 1, correctIndex: 1 },
      { id: 's1m5', text: 'What is the determinant of [[2,3],[1,4]]?', options: ['2', '5', '8', '11'], points: 1, correctIndex: 1 },
      { id: 's1m6', text: 'Find the sum of the first 10 terms of AP: 2, 5, 8...', options: ['125', '135', '145', '155'], points: 1, correctIndex: 3 },
      { id: 's1m7', text: 'If sin θ = 3/5, what is cos θ?', options: ['3/5', '4/5', '5/3', '5/4'], points: 1, correctIndex: 1 },
      { id: 's1m8', text: 'What is the gradient of a line perpendicular to y = 2x + 1?', options: ['2', '-2', '1/2', '-1/2'], points: 1, correctIndex: 3 },
      { id: 's1m9', text: 'Simplify: (2x³)²', options: ['2x⁶', '4x⁶', '4x⁵', '2x⁵'], points: 1, correctIndex: 1 },
      { id: 's1m10', text: 'What is the domain of f(x) = 1/x?', options: ['x > 0', 'x < 0', 'All real numbers', 'All real numbers except 0'], points: 1, correctIndex: 3 },
    ],
    english: [
      { id: 's1e1', text: 'What is irony?', options: ['A joke', 'Difference between expectation and reality', 'A comparison', 'An exaggeration'], points: 1, correctIndex: 1 },
      { id: 's1e2', text: 'A fire station burns down - what type of irony?', options: ['Verbal', 'Situational', 'Dramatic', 'Cosmic'], points: 1, correctIndex: 1 },
      { id: 's1e3', text: 'What is a protagonist?', options: ['The villain', 'The hero/main character', 'The narrator', 'The setting'], points: 1, correctIndex: 1 },
      { id: 's1e4', text: 'Choose: "The rain ___ heavily yesterday"', options: ['fall', 'fell', 'fallen', 'falling'], points: 1, correctIndex: 1 },
      { id: 's1e5', text: '"We shall fight on the beaches" - what device?', options: ['Simile', 'Metaphor', 'Anaphora', 'Alliteration'], points: 1, correctIndex: 2 },
      { id: 's1e6', text: 'What is the difference between "affect" and "effect"?', options: ['No difference', 'Affect=verb, effect=noun', 'Affect=noun, effect=verb', 'Both are nouns'], points: 1, correctIndex: 1 },
      { id: 's1e7', text: 'What is an allegory?', options: ['A short story', 'A story with hidden moral/political meaning', 'A type of poem', 'A dialogue'], points: 1, correctIndex: 1 },
      { id: 's1e8', text: 'What is a paradox?', options: ['A comparison', 'A self-contradicting statement that reveals truth', 'An exaggeration', 'A question'], points: 1, correctIndex: 1 },
      { id: 's1e9', text: 'Which is an example of oxymoron?', options: ['As white as snow', 'Deafening silence', 'He runs fast', 'The sun is hot'], points: 1, correctIndex: 1 },
      { id: 's1e10', text: 'What is the tone of a pessimistic text?', options: ['Hopeful', 'Negative/gloomy', 'Neutral', 'Excited'], points: 1, correctIndex: 1 },
    ],
  },
  'SSS 2': {
    math: [
      { id: 's2m1', text: 'Find dy/dx of y = x³', options: ['x²', '2x', '3x²', '3x³'], points: 1, correctIndex: 2 },
      { id: 's2m2', text: 'What is the integral of 2x dx?', options: ['x²', 'x² + C', '2 + C', '2x² + C'], points: 1, correctIndex: 1 },
      { id: 's2m3', text: 'Find the mean of: 4, 6, 8, 10, 12', options: ['6', '8', '10', '40'], points: 1, correctIndex: 1 },
      { id: 's2m4', text: 'Find the derivative of sin(x)', options: ['sin(x)', '-sin(x)', 'cos(x)', '-cos(x)'], points: 1, correctIndex: 2 },
      { id: 's2m5', text: 'What is the area under y = x from x=0 to x=2?', options: ['1', '2', '4', '8'], points: 1, correctIndex: 1 },
      { id: 's2m6', text: 'If P(A) = 0.3, what is P(not A)?', options: ['0.3', '0.5', '0.7', '1.3'], points: 1, correctIndex: 2 },
      { id: 's2m7', text: 'What is tan 45°?', options: ['0', '1', '√3', 'Undefined'], points: 1, correctIndex: 1 },
      { id: 's2m8', text: 'Find the median of: 3, 7, 9, 12, 15', options: ['7', '9', '10', '12'], points: 1, correctIndex: 1 },
      { id: 's2m9', text: 'What is the second derivative of y = x⁴?', options: ['4x³', '12x²', '12x', '24x'], points: 1, correctIndex: 1 },
      { id: 's2m10', text: 'What is the standard deviation used to measure?', options: ['Average', 'Spread of data', 'Middle value', 'Most frequent value'], points: 1, correctIndex: 1 },
    ],
    english: [
      { id: 's2e1', text: 'What is a critical essay?', options: ['A story', 'An evaluation and analysis of a text', 'A summary', 'A poem'], points: 1, correctIndex: 1 },
      { id: 's2e2', text: 'What is the difference between denotation and connotation?', options: ['No difference', 'Denotation=literal meaning, connotation=associated meaning', 'Denotation=emotional, connotation=factual', 'Both are figurative'], points: 1, correctIndex: 1 },
      { id: 's2e3', text: '"9 out of 10 experts recommend" - what persuasive technique?', options: ['Emotional appeal', 'Statistical appeal', 'Expert testimony', 'Bandwagon'], points: 1, correctIndex: 1 },
      { id: 's2e4', text: 'What is structuralism in literature?', options: ['A writing style', 'Analysis of underlying structures in texts', 'A type of poem', 'A narrative technique'], points: 1, correctIndex: 1 },
      { id: 's2e5', text: 'What is the difference between a theme and a motif?', options: ['No difference', 'Theme=central idea, motif=recurring element', 'Theme=character, motif=setting', 'Theme=plot, motif=dialogue'], points: 1, correctIndex: 1 },
      { id: 's2e6', text: '"You are young, so you cannot understand" - what fallacy?', options: ['Straw man', 'Ad hominem', 'Red herring', 'Slippery slope'], points: 1, correctIndex: 1 },
      { id: 's2e7', text: 'What is an annotated bibliography?', options: ['A summary', 'A list of sources with brief descriptions', 'A research paper', 'A thesis'], points: 1, correctIndex: 1 },
      { id: 's2e8', text: 'What is the difference between a summary and an analysis?', options: ['No difference', 'Summary=retelling, analysis=interpreting', 'Summary=long, analysis=short', 'Summary=opinion, analysis=fact'], points: 1, correctIndex: 1 },
      { id: 's2e9', text: 'What is deconstruction?', options: ['A writing method', 'Examining how meaning is constructed and undermined', 'A type of essay', 'A literary genre'], points: 1, correctIndex: 1 },
      { id: 's2e10', text: 'What is the purpose of a literary analysis?', options: ['To summarize', 'To interpret and evaluate a text', 'To entertain', 'To persuade'], points: 1, correctIndex: 1 },
    ],
  },
  'SSS 3': {
    math: [
      { id: 's3m1', text: 'Solve: sin 2θ = cos θ for 0° ≤ θ ≤ 360°', options: ['θ=30°,150°', 'θ=30°,150°,210°,330°', 'θ=45°,135°', 'θ=60°,120°'], points: 1, correctIndex: 1 },
      { id: 's3m2', text: 'What is the inverse of matrix [[1,2],[3,4]]?', options: ['[[-2,1],[1.5,-0.5]]', '[[-4,2],[3,-1]]', '[[4,-2],[-3,1]]', '[[0.5,0],[0,0.25]]'], points: 1, correctIndex: 0 },
      { id: 's3m3', text: 'Evaluate: ∫(3x² + 2x)dx', options: ['x³ + x²', 'x³ + x² + C', '3x + 2 + C', '6x + 2'], points: 1, correctIndex: 1 },
      { id: 's3m4', text: 'Find the limit of (x²-1)/(x-1) as x approaches 1', options: ['0', '1', '2', 'Undefined'], points: 1, correctIndex: 2 },
      { id: 's3m5', text: 'What is the rank of a 3×3 identity matrix?', options: ['0', '1', '2', '3'], points: 1, correctIndex: 3 },
      { id: 's3m6', text: 'Find log₂ 32', options: ['3', '4', '5', '6'], points: 1, correctIndex: 2 },
      { id: 's3m7', text: 'What is the dot product of [1,2,3] and [4,5,6]?', options: ['32', '15', '20', '90'], points: 1, correctIndex: 0 },
      { id: 's3m8', text: 'Solve the differential equation dy/dx = y', options: ['y = Ce^x', 'y = e^x', 'y = x + C', 'y = Cx'], points: 1, correctIndex: 0 },
      { id: 's3m9', text: 'What is the eigenvalue of identity matrix I for any vector?', options: ['0', '1', '-1', 'Depends on vector'], points: 1, correctIndex: 1 },
      { id: 's3m10', text: 'Find the cross product of [1,0,0] and [0,1,0]', options: ['[0,0,0]', '[1,1,0]', '[0,0,1]', '[-1,0,0]'], points: 1, correctIndex: 2 },
    ],
    english: [
      { id: 's3e1', text: 'What is postmodernism in literature?', options: ['A writing style', 'A movement questioning grand narratives and absolute truths', 'A type of poetry', 'A Victorian movement'], points: 1, correctIndex: 1 },
      { id: 's3e2', text: 'What is unreliable narration?', options: ['Poor writing', 'A narrator whose credibility is compromised', 'Third person POV', 'A dialogue technique'], points: 1, correctIndex: 1 },
      { id: 's3e3', text: 'What literary movement is Chinua Achebe associated with?', options: ['Romanticism', 'Post-colonialism', 'Modernism', 'Victorian'], points: 1, correctIndex: 1 },
      { id: 's3e4', text: 'What is intertextuality?', options: ['Internal dialogue', 'The relationship between texts and how they reference each other', 'A type of metaphor', 'Character development'], points: 1, correctIndex: 1 },
      { id: 's3e5', text: 'What is the main difference between modernism and postmodernism?', options: ['No difference', 'Modernism seeks meaning, postmodernism questions it', 'Postmodernism is older', 'Modernism is more creative'], points: 1, correctIndex: 1 },
      { id: 's3e6', text: 'What is magical realism?', options: ['Fantasy genre', 'Blending realistic narrative with surreal elements', 'Science fiction', 'Historical fiction'], points: 1, correctIndex: 1 },
      { id: 's3e7', text: 'What is semiotic analysis?', options: ['Mathematical analysis', 'Study of signs and symbols in communication', 'A type of literary review', 'Statistical analysis'], points: 1, correctIndex: 1 },
      { id: 's3e8', text: 'What is the difference between ideology and hegemony?', options: ['No difference', 'Ideology=belief system, hegemony=dominance through consent', 'Both are political', 'Hegemony is a type of ideology'], points: 1, correctIndex: 1 },
      { id: 's3e9', text: 'What is feminist literary criticism?', options: ['Criticizing female authors', 'Examining how gender is represented in literature', 'A type of poetry', 'Writing by feminists'], points: 1, correctIndex: 1 },
      { id: 's3e10', text: 'What is the purpose of a critical theory?', options: ['To entertain', 'To analyze and interpret cultural/social phenomena', 'To write fiction', 'To teach grammar'], points: 1, correctIndex: 1 },
    ],
  },
};

const ALL_CLASSES = [
  'JSS 1 - Gladness', 'JSS 1 - Holiness', 'JSS 1 - Righteousness', 'JSS 1 - Temperance', 'JSS 1 - Victory',
  'JSS 2 - Faith', 'JSS 2 - Greatness', 'JSS 2 - Joy', 'JSS 2 - Kindness', 'JSS 2 - Meekness',
  'JSS 3 - Goodness', 'JSS 3 - Mercy', 'JSS 3 - Purity',
  'SSS 1 - Fidelity', 'SSS 1 - Gentleness', 'SSS 1 - Patience',
  'SSS 2 - Diligence', 'SSS 2 - Glory', 'SSS 2 - Peace',
  'SS3', 'SS2', 'SS1',
];

function getLevelForClass(className: string): string {
  if (className.startsWith('JSS 1')) return 'JSS 1';
  if (className.startsWith('JSS 2')) return 'JSS 2';
  if (className.startsWith('JSS 3')) return 'JSS 3';
  if (className.startsWith('SSS 1') || className === 'SS1') return 'SSS 1';
  if (className.startsWith('SSS 2') || className === 'SS2') return 'SSS 2';
  if (className === 'SS3') return 'SSS 3';
  return 'JSS 1';
}

const DEFAULT_LESSONS = [
  { id: 'ls001', subject: 'Mathematics', topic: 'Advanced Calculus & Integration Methods', time: '10:00 AM - 11:30 AM', isLive: true, icon: 'pen-tool', iconBg: '#EDF4FD', iconColor: '#2D7DD2' },
  { id: 'ls002', subject: 'Biology', topic: 'Molecular Genetics and DNA Structure', time: '12:00 PM - 01:00 PM', isLive: true, icon: 'dna', iconBg: '#EEF7F0', iconColor: '#2D9B6F' },
  { id: 'ls003', subject: 'History', topic: "The Industrial Revolution's Global Impact", time: '02:30 PM - 03:45 PM', isLive: true, icon: 'globe', iconBg: '#F5F0E8', iconColor: '#8B6A3C' },
  { id: 'ls004', subject: 'English Literature', topic: 'Poetry Analysis Workshop', time: '09:00 AM - 09:45 AM', isLive: false, icon: 'book-open', iconBg: '#F5F0E8', iconColor: '#9B7B3C' },
];

const DEFAULT_SCHEMES = [
  { id: 'sch001', subject: 'Mathematics', title: 'Term 2 Algebra', description: 'Linear equations and inequalities', week: '02', term: 'Second Term', class: 'SS3', createdBy: 'T001' },
  { id: 'sch002', subject: 'Biology', title: 'Genetics Basics', description: 'DNA structure and replication', week: '03', term: 'Second Term', class: 'SS2', createdBy: 'T002' },
  { id: 'sch003', subject: 'History', title: 'Industrial Revolution', description: 'Socio-economic impacts', week: '04', term: 'Second Term', class: 'SS1', createdBy: 'T003' },
];

const DEFAULT_LESSON_PLANS = [
  { id: 'lp001', subject: 'Mathematics', topic: 'Quadratic Equations', week: '02', term: 'Second Term', class: 'SS3', objectives: 'Solve quadratic equations using factorization and formula.', materials: 'Textbook, worksheets', createdBy: 'T001' },
  { id: 'lp002', subject: 'Biology', topic: 'DNA Replication', week: '03', term: 'Second Term', class: 'SS2', objectives: 'Explain DNA replication process.', materials: 'Slides, lab kit', createdBy: 'T002' },
  { id: 'lp003', subject: 'History', topic: 'Industrial Revolution', week: '04', term: 'Second Term', class: 'SS1', objectives: 'Describe key inventions and their impacts.', materials: 'Documentary clip', createdBy: 'T003' },
];

const DEFAULT_REPORTS: Array<{
  id: string;
  userId: string;
  userName: string;
  category: ReportCategory;
  description: string;
  read: boolean;
  status: string;
  date: string;
}> = [
  { id: 'rep001', userId: 'SA001', userName: 'Super Administrator', category: 'feedback', description: 'The portal is helpful for revision.', read: true, status: 'resolved', date: '18 Jan 26' },
  { id: 'rep002', userId: 'T002', userName: 'Biology Teacher', category: 'suggestion', description: 'Add more lab resources.', read: false, status: 'pending', date: '20 Jan 26' },
  { id: 'rep003', userId: 'A001', userName: 'Administrator', category: 'complaint', description: 'Reports list not sorting properly.', read: true, status: 'in-progress', date: '21 Jan 26' },
  { id: 'rep004', userId: 'P001', userName: 'Principal', category: 'emergency', description: 'System outage during exam.', read: false, status: 'pending', date: '22 Jan 26' },
];

const DEFAULT_ADMISSIONS: Array<{
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  class: string;
  parentName: string;
  parentPhone: string;
  status: AdmissionStatus;
  session: string;
}> = [
  { id: 'adm001', firstName: 'Jane', lastName: 'Okeke', email: 'jane.parent@example.com', phone: '08030000001', dateOfBirth: '2010-05-12', gender: 'Female', class: 'SS1', parentName: 'Mr. Okeke', parentPhone: '08030000002', status: 'pending', session: '2024/2025' },
  { id: 'adm002', firstName: 'David', lastName: 'Ibrahim', email: 'david.parent@example.com', phone: '08030000003', dateOfBirth: '2009-08-20', gender: 'Male', class: 'SS2', parentName: 'Mrs. Ibrahim', parentPhone: '08030000004', status: 'approved', session: '2024/2025' },
  { id: 'adm003', firstName: 'Lola', lastName: 'Balogun', email: 'lola.parent@example.com', phone: '08030000005', dateOfBirth: '2011-01-05', gender: 'Female', class: 'JSS 3 - Purity', parentName: 'Mr. Balogun', parentPhone: '08030000006', status: 'rejected', session: '2024/2025' },
];

const DEFAULT_ACCOUNT_SETTINGS = {
  id: 'acct001',
  feeAmount: 50000,
  threshold30: 15000,
  threshold70: 35000,
  schoolEmail: 'accounts@yems.local',
  emailSubject: 'School Fee Bill - {student_name}',
  accountNumber: '0123456789',
};

async function main() {
  console.log('Seeding database...');

  // 1. Clear database
  console.log('Clearing database tables...');
  await db.delete(payments);
  await db.delete(bills);
  await db.delete(admissions);
  await db.delete(reports);
  await db.delete(lessonPlans);
  await db.delete(schemes);
  await db.delete(lessons);
  await db.delete(submissions);
  await db.delete(results);
  await db.delete(midtermResults);
  await db.delete(exams);
  await db.delete(assignments);
  await db.delete(notes);
  await db.delete(notifications);
  await db.delete(users);
  await db.delete(subjects);
  await db.delete(classes);
  await db.delete(accountSettings);
  console.log('Database cleared.');

  // 2. Parse students.csv
  let csvPath = path.join(process.cwd(), 'students.csv');
  if (!fs.existsSync(csvPath)) {
    csvPath = path.join(process.cwd(), '..', 'students.csv');
  }
  if (!fs.existsSync(csvPath)) {
    csvPath = path.join(process.cwd(), '..', '..', 'students.csv');
  }
  
  if (!fs.existsSync(csvPath)) {
    console.error(`students.csv not found at ${csvPath}`);
    process.exit(1);
  }

  console.log(`Reading students.csv from ${csvPath}...`);
  const csvData = fs.readFileSync(csvPath, 'utf8');
  const lines = csvData.split('\n').filter((line) => line.trim() !== '');
  const headers = lines[0].split(',').map((h) => h.trim());
  
  const studentsData = lines.slice(1).map((line) => {
    const values = line.split(',');
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ? values[index].trim() : '';
    });
    return row;
  });
  console.log(`Parsed ${studentsData.length} students from CSV.`);

  // 3. Extract unique classes and insert them
  console.log('Seeding classes...');
  const uniqueClasses = new Set<string>();
  for (const s of studentsData) {
    if (s.Class && s.Class !== 'Unknown' && s.Class !== '') {
      uniqueClasses.add(s.Class);
    }
  }
  uniqueClasses.add('SS3');
  uniqueClasses.add('SS2');
  uniqueClasses.add('SS1');

  for (const className of uniqueClasses) {
    const parts = className.split(' - ');
    const level = parts[0] || className;
    const stream = parts[1] || 'General';
    await db.insert(classes).values({
      id: generateId(),
      level,
      stream,
      displayName: className,
    });
  }
  console.log(`Seeded ${uniqueClasses.size} classes.`);

  // 4. Seed system users (admin, superadmin, teacher, accountant, principal, hod, technician, parent)
  console.log('Seeding system users...');
  for (const userData of DEFAULT_USERS) {
    const hashedPassword = await hashPassword(userData.password);
    await db.insert(users).values({
      id: userData.id,
      name: userData.name,
      initials: userData.initials,
      email: userData.email,
      password: hashedPassword,
      role: userData.role,
      studentId: userData.studentId,
      teacherId: userData.teacherId,
      adminId: userData.adminId,
      accountantId: userData.accountantId,
      class: userData.class,
      session: userData.session,
      term: userData.term,
      sex: userData.sex,
      admissionNo: userData.admissionNo,
      assignedSubjects: userData.assignedSubjects,
      assignedClasses: userData.assignedClasses,
      isClassTeacher: userData.isClassTeacher,
      classTeacherOf: userData.classTeacherOf,
    });
  }

  // 5. Seed students from CSV
  console.log('Seeding student users...');
  const seededEmails = new Set<string>();
  const seededIds = new Set<string>();

  // Add system users to deduplication sets
  for (const u of DEFAULT_USERS) {
    seededEmails.add(u.email.toLowerCase().trim());
    seededIds.add(u.id);
  }
  
  // Add Naruto
  seededEmails.add('naruto@yems.local');
  seededIds.add('f10bbc31-c982-41a6-8772-1983047482d4');

  for (const student of studentsData) {
    const email = student.Email?.toLowerCase().trim();
    const id = student.id?.trim();

    if (!id || !email) {
      continue;
    }

    if (seededIds.has(id)) {
      console.log(`Skipping duplicate student ID: ${id}`);
      continue;
    }

    if (seededEmails.has(email)) {
      console.log(`Skipping duplicate student email: ${email}`);
      continue;
    }

    seededIds.add(id);
    seededEmails.add(email);

    const hashedPassword = await hashPassword(student.Password || 'student123');
    const initials = ((student.FirstName?.charAt(0) || '') + (student.LastName?.charAt(0) || '')).toUpperCase();
    await db.insert(users).values({
      id: student.id,
      name: student.Name,
      initials: initials || 'ST',
      email: student.Email,
      password: hashedPassword,
      role: 'student',
      studentId: student.id,
      class: student.Class || 'Unknown',
      session: '2024/2025',
      term: 'Second Term',
      sex: student.Gender || 'Unknown',
      admissionNo: student.id,
    });
  }

  // 6. Create custom test student Naruto and his Core Subject result
  console.log('Seeding custom student Naruto...');
  const narutoPassword = await hashPassword('naruto123');
  await db.insert(users).values({
    id: 'f10bbc31-c982-41a6-8772-1983047482d4',
    name: 'Naruto',
    initials: 'N',
    email: 'naruto@yems.local',
    password: narutoPassword,
    role: 'student',
    studentId: 'f10bbc31-c982-41a6-8772-1983047482d4',
    class: 'SS3',
    session: '2024/2025',
    term: 'Second Term',
    sex: 'Male',
    admissionNo: 'YEMS-NARUTO',
  });

  await db.insert(results).values({
    id: generateId(),
    studentId: 'f10bbc31-c982-41a6-8772-1983047482d4',
    examId: generateId(),
    subject: 'Core Subject',
    score: 50,
    totalScore: 70,
    grade: 'B',
    remarks: 'Good performance',
    class: 'SS3',
    session: '2024/2025',
    term: 'Second Term',
    examTitle: 'Core Subject Midterm',
    date: '11 Jun 26',
  });
  console.log('Created Naruto user & results.');

  // 7. Seed subjects
  console.log('Seeding subjects...');
  for (const subj of DEFAULT_SUBJECTS) {
    await db.insert(subjects).values({
      id: generateId(),
      name: subj.name,
      code: subj.code,
      category: subj.category,
      department: subj.department || null,
    });
  }

  // 8. Seed Test Run exams (one per class)
  console.log('Seeding Test Run exams...');
  for (const className of ALL_CLASSES) {
    const level = getLevelForClass(className);
    const bank = QUESTION_BANK[level];
    const questions = [...bank.math, ...bank.english];

    await db.insert(exams).values({
      id: generateId(),
      title: `Test Run - ${className}`,
      desc: `Midterm practice exam for ${className} covering Mathematics and English Language.`,
      type: 'midterm',
      format: 'mcq',
      questions,
      duration: 60,
      passingScore: 50,
      subject: 'Test Run',
      class: className,
      status: 'active',
      showResults: true,
      questionsCount: questions.length,
      questionsList: questions,
      createdBy: 'A001',
    });
  }
  console.log(`Seeded ${ALL_CLASSES.length} Test Run exams.`);

  // 9. Seed lessons
  console.log('Seeding lessons...');
  for (const lesson of DEFAULT_LESSONS) {
    await db.insert(lessons).values({
      id: lesson.id,
      subject: lesson.subject,
      topic: lesson.topic,
      time: lesson.time,
      isLive: lesson.isLive,
      icon: lesson.icon,
      iconBg: lesson.iconBg,
      iconColor: lesson.iconColor,
    });
  }

  // 9. Seed schemes
  console.log('Seeding schemes...');
  for (const scheme of DEFAULT_SCHEMES) {
    await db.insert(schemes).values({
      id: scheme.id,
      subject: scheme.subject,
      title: scheme.title,
      description: scheme.description,
      week: scheme.week,
      term: scheme.term,
      class: scheme.class,
      createdBy: scheme.createdBy,
    });
  }

  // 10. Seed lesson plans
  console.log('Seeding lesson plans...');
  for (const plan of DEFAULT_LESSON_PLANS) {
    await db.insert(lessonPlans).values({
      id: plan.id,
      subject: plan.subject,
      topic: plan.topic,
      week: plan.week,
      term: plan.term,
      class: plan.class,
      objectives: plan.objectives,
      materials: plan.materials,
      createdBy: plan.createdBy,
    });
  }

  // 11. Seed reports
  console.log('Seeding reports...');
  for (const report of DEFAULT_REPORTS) {
    await db.insert(reports).values({
      id: report.id,
      userId: report.userId,
      userName: report.userName,
      category: report.category,
      description: report.description,
      read: report.read,
      status: report.status,
      date: report.date,
    });
  }

  // 12. Seed admissions
  console.log('Seeding admissions...');
  for (const admission of DEFAULT_ADMISSIONS) {
    await db.insert(admissions).values({
      id: admission.id,
      firstName: admission.firstName,
      lastName: admission.lastName,
      email: admission.email,
      phone: admission.phone,
      dateOfBirth: admission.dateOfBirth,
      gender: admission.gender,
      class: admission.class,
      parentName: admission.parentName,
      parentPhone: admission.parentPhone,
      status: admission.status,
      session: admission.session,
    });
  }

  // 13. Seed account settings
  console.log('Seeding account settings...');
  await db.insert(accountSettings).values({
    id: DEFAULT_ACCOUNT_SETTINGS.id,
    feeAmount: DEFAULT_ACCOUNT_SETTINGS.feeAmount,
    threshold30: DEFAULT_ACCOUNT_SETTINGS.threshold30,
    threshold70: DEFAULT_ACCOUNT_SETTINGS.threshold70,
    schoolEmail: DEFAULT_ACCOUNT_SETTINGS.schoolEmail,
    emailSubject: DEFAULT_ACCOUNT_SETTINGS.emailSubject,
    accountNumber: DEFAULT_ACCOUNT_SETTINGS.accountNumber,
  });

  // 14. Seed bills for students
  console.log('Seeding billing & payments...');
  // We can seed bills for our custom student and a few default students
  const BILLABLE_STUDENTS = [
    { id: 'f10bbc31-c982-41a6-8772-1983047482d4', name: 'Naruto', class: 'SS3' },
    { id: 'YEMS261000', name: 'Oluwaseun Adebanjo', class: 'JSS 1 - Victory' },
    { id: 'YEMS261001', name: 'Oloko Elias', class: 'JSS 1 - Victory' },
  ];

  for (const student of BILLABLE_STUDENTS) {
    const billId = generateId();
    await db.insert(bills).values({
      id: billId,
      studentId: student.id,
      studentName: student.name,
      class: student.class,
      amount: 50000,
      description: 'Second Term School Fees',
      dueDate: new Date('2026-02-01'),
      status: 'pending',
    });

    // Seed a partial payment for Naruto, and full payment for Oluwaseun
    if (student.name === 'Naruto') {
      await db.insert(payments).values({
        id: generateId(),
        billId: billId,
        studentId: student.id,
        studentName: student.name,
        class: student.class,
        amount: 30000,
        paymentMethod: 'bank_transfer',
        reference: 'TRX-NARUTO-001',
        status: 'completed',
        paidAt: new Date('2026-01-18T08:30:00Z'),
      });
    } else if (student.name === 'Oluwaseun Adebanjo') {
      await db.insert(payments).values({
        id: generateId(),
        billId: billId,
        studentId: student.id,
        studentName: student.name,
        class: student.class,
        amount: 50000,
        paymentMethod: 'cash',
        reference: 'CASH-SEUN-002',
        status: 'completed',
        paidAt: new Date('2026-01-19T10:00:00Z'),
      });
    }
  }

  console.log('Seeding complete');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
