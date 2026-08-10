import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'logs'],
    setupFiles: ['src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/modules/admissions/admissions.service.ts',
        'src/modules/notifications/notifications.service.ts',
        'src/modules/reports/reports.service.ts',
        'src/modules/results/results.service.ts',
        'src/modules/schemes/schemes.service.ts',
        'src/modules/lesson-plans/lesson-plans.service.ts',
        'src/modules/lessons/lessons.service.ts',
        'src/modules/midterm-results/midterm-results.service.ts',
        'src/modules/submissions/submissions.service.ts',
        'src/modules/exams/exams.service.ts',
        'src/modules/assignments/assignments.service.ts',
        'src/modules/notes/notes.service.ts',
      ],
      exclude: ['src/**/*.test.ts', 'src/main.ts', 'src/scripts/**'],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70
      }
    }
  }
});