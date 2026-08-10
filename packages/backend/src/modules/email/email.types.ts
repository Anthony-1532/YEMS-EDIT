export interface SendEmailPayload {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export interface WelcomeEmailJobData {
  to: string;
  name: string;
}
