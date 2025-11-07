"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var EmailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
let nodemailer = null;
try {
    nodemailer = require('nodemailer');
}
catch { }
let EmailService = EmailService_1 = class EmailService {
    logger = new common_1.Logger(EmailService_1.name);
    transporter = null;
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
        }
        else {
            this.logger.warn('SMTP not configured. EmailService will log emails to console.');
        }
    }
    async send(to, subject, html, text) {
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
    async sendWithAttachments(to, subject, html, attachments, text) {
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
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = EmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], EmailService);
//# sourceMappingURL=email.service.js.map