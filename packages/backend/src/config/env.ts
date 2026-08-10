import { zEnv } from '../shared/validators/env.validator.js';

const parsed = zEnv.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;