import { Worker, Queue } from 'bullmq';
import { env } from '../../config/env.js';
import logger from '../../config/logger.js';
import { getBullMqConnection } from '../../queue/redis.js';
import { SUBMISSIONS_QUEUE_NAME } from './submissions.queue.js';
import type { GradingJobData } from './submissions.queue.js';
import { gradeSubmission } from './submissions.service.js';
import { getExamById, gradeMcqAnswers } from '../exams/exams.service.js';

let submissionsWorker: Worker<GradingJobData> | null = null;
let submissionsQueue: Queue<GradingJobData> | null = null;

export function getSubmissionsQueue(): Queue<GradingJobData> {
  if (submissionsQueue) return submissionsQueue;

  const bullMqConn = getBullMqConnection();
  if (!bullMqConn) {
    throw new Error('BullMQ connection not available for submissions queue');
  }

  submissionsQueue = new Queue<GradingJobData>(SUBMISSIONS_QUEUE_NAME, {
    connection: bullMqConn,
    prefix: env.QUEUE_PREFIX,
  });

  return submissionsQueue;
}

export function startSubmissionsWorker(): Worker<GradingJobData> {
  if (submissionsWorker) {
    return submissionsWorker;
  }

  const bullMqConn = getBullMqConnection();
  if (!bullMqConn) {
    logger.warn('BullMQ connection not available - submissions worker not started');
    return null as any;
  }

  // Concurrency set to handle up to 500 students efficiently
  submissionsWorker = new Worker<GradingJobData>(
    SUBMISSIONS_QUEUE_NAME,
    async (job) => {
      logger.info(`Processing grading job ${job.id} for submission ${job.data.submissionId}`);
      
      try {
        // Auto-grade by comparing the student's submitted answers against the
        // exam's real answer key (correctIndex/correct). No random/mock scoring.
        const exam = await getExamById(job.data.examId);
        if (!exam) {
          throw new Error(`Exam ${job.data.examId} not found for grading submission ${job.data.submissionId}`);
        }

        const questions = (exam.questionsList || exam.questions || []) as any[];
        const { score, totalScore } = gradeMcqAnswers(questions, job.data.answers ?? {});

        await gradeSubmission(job.data.submissionId, {
          score,
          totalScore,
          gradedBy: 'system-worker',
          feedback: 'Automatically graded by system.',
        });

        logger.info(`Grading completed for submission ${job.data.submissionId}`);
      } catch (err) {
        logger.error(`Error grading submission ${job.data.submissionId}`, err);
        throw err;
      }
    },
    {
      connection: bullMqConn,
      prefix: env.QUEUE_PREFIX,
      concurrency: 50, // Process 50 jobs concurrently to handle bursts
    }
  );

  submissionsWorker.on('completed', (job) => {
    logger.info('Submissions grading job completed', { jobId: job.id });
  });

  submissionsWorker.on('failed', (job, error) => {
    logger.error('Submissions grading job failed', {
      jobId: job?.id,
      error: error.message,
    });
  });

  return submissionsWorker;
}

export async function stopSubmissionsWorker(): Promise<void> {
  if (submissionsQueue) {
    await submissionsQueue.close();
    submissionsQueue = null;
  }
  if (!submissionsWorker) return;
  await submissionsWorker.close();
  submissionsWorker = null;
}
