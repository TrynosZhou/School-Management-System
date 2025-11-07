export declare class EmailService {
    private readonly logger;
    private transporter;
    constructor();
    send(to: string | string[], subject: string, html: string, text?: string): Promise<{
        ok: boolean;
        mocked: boolean;
    } | {
        ok: boolean;
        mocked?: undefined;
    }>;
    sendWithAttachments(to: string | string[], subject: string, html: string, attachments: Array<{
        filename: string;
        content: Buffer | string;
        contentType?: string;
    }>, text?: string): Promise<{
        ok: boolean;
        mocked: boolean;
    } | {
        ok: boolean;
        mocked?: undefined;
    }>;
}
