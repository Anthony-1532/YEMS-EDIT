export const SUBMISSIONS_QUEUE_NAME = 'submissions_grading_queue';

export interface GradingJobData {
  submissionId: string;
  examId: string;
  studentId: string;
  answers: Record<string, any>;
  type: 'exam' | 'assignment' | 'note';
}
