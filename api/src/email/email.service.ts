import { Injectable, Logger } from '@nestjs/common';
// dynamic import to avoid type/lint errors if nodemailer isn't installed
let nodemailer: any = null;
try { nodemailer = require('nodemailer'); } catch {}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: any | null = null;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (nodemailer && host && port && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    } else {
      this.logger.warn('SMTP not configured. EmailService will log emails to console.');
    }
  }

  async send(to: string | string[], subject: string, html: string, text?: string) {
    const from = process.env.SMTP_FROM || 'no-reply@schoolpro.local';
    const toList = Array.isArray(to) ? to.join(',') : to;
    if (!this.transporter) {
      this.logger.log(`Email (mock): to=${toList}, subject=${subject}`);
      this.logger.debug(html);
      return { ok: true, mocked: true };
    }
    await this.transporter.sendMail({ from, to: toList, subject, html, text: text || html.replace(/<[^>]+>/g, '') });
    return { ok: true };
  }

  async sendWithAttachments(
    to: string | string[],
    subject: string,
    html: string,
    attachments: Array<{ filename: string; content: Buffer | string; contentType?: string }>,
    text?: string,
  ) {
    const from = process.env.SMTP_FROM || 'no-reply@schoolpro.local';
    const toList = Array.isArray(to) ? to.join(',') : to;
    if (!this.transporter) {
      this.logger.log(`Email (mock): to=${toList}, subject=${subject}, attachments=${attachments?.length || 0}`);
      this.logger.debug(html);
      return { ok: true, mocked: true };
    }
    await this.transporter.sendMail({ from, to: toList, subject, html, text: text || html.replace(/<[^>]+>/g, ''), attachments });
    return { ok: true };
  }
}
