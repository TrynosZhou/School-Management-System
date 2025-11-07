import { ElearningService } from './elearning.service';
export declare class ElearningController {
    private readonly svc;
    constructor(svc: ElearningService);
    studentSignup(body: any): {
        ok: boolean;
        role: "student" | "teacher";
        email: any;
    };
    studentLogin(body: any): {
        ok: boolean;
        role: "student" | "teacher";
        token: string;
    };
    teacherSignup(body: any): {
        ok: boolean;
        role: "student" | "teacher";
        email: any;
    };
    teacherLogin(body: any): {
        ok: boolean;
        role: "student" | "teacher";
        token: string;
    };
    uploadResource(file: any, body: any): {
        id: string;
        type: any;
        title: any;
        classRef: any;
        subject: any;
        syllabusCode: any;
        url: string;
        startAt: number | undefined;
        endAt: number | undefined;
        dueAt: number | undefined;
    };
    listResources(role?: string, classRef?: string, now?: string): {
        id: string;
        type: string;
        title: string;
        classRef?: string;
        subject?: string;
        syllabusCode?: string;
        url: string;
        startAt?: number;
        endAt?: number;
        dueAt?: number;
    }[];
    submitResource(id: string, file: any, body: any): {
        ok: boolean;
        error: string;
        id?: undefined;
    } | {
        ok: boolean;
        id: string;
        error?: undefined;
    };
    listSubmissions(role?: string, classRef?: string): {
        id: string;
        resourceId: string;
        resourceTitle: string;
        type: string;
        classRef?: string;
        subject?: string;
        student?: string;
        url: string;
        createdAt: number;
    }[];
    listTests(): {
        id: string;
        title: string;
        questionCount: number;
    }[];
    getTest(id: string): {
        error: string;
        id?: undefined;
        title?: undefined;
        questions?: undefined;
    } | {
        id: string;
        title: string;
        questions: {
            id: string;
            text: string;
            options: string[];
        }[];
        error?: undefined;
    };
    submitTest(id: string, body: any): {
        error: string;
        ok?: undefined;
        total?: undefined;
        score?: undefined;
    } | {
        ok: boolean;
        total: number;
        score: number;
        error?: undefined;
    };
    removeTest(id: string): any;
    generateAiTest(body: any): Promise<{
        ok: boolean;
        error: string;
        hint: string;
        path?: undefined;
        detail?: undefined;
        resource?: undefined;
    } | {
        ok: boolean;
        error: string;
        path: string;
        detail: string;
        hint?: undefined;
        resource?: undefined;
    } | {
        ok: boolean;
        error: string;
        hint?: undefined;
        path?: undefined;
        detail?: undefined;
        resource?: undefined;
    } | {
        ok: boolean;
        error: string;
        detail: string;
        hint?: undefined;
        path?: undefined;
        resource?: undefined;
    } | {
        ok: boolean;
        resource: {
            id: string;
            type: string;
            title: string;
            classRef: string;
            url: string;
        };
        error?: undefined;
        hint?: undefined;
        path?: undefined;
        detail?: undefined;
    }>;
    mark(file: any): {
        ok: boolean;
        score: number;
        total: number;
        summary: string;
    };
    buildBank(body: any, files: any[]): Promise<{
        ok: boolean;
        error: string;
        detail?: undefined;
        count?: undefined;
        total?: undefined;
        bank?: undefined;
        resource?: undefined;
    } | {
        ok: boolean;
        error: string;
        detail: any;
        count?: undefined;
        total?: undefined;
        bank?: undefined;
        resource?: undefined;
    } | {
        ok: boolean;
        count: number;
        total: number;
        bank: string;
        resource: any;
        error?: undefined;
        detail?: undefined;
    }>;
    getProgress(id: string): {
        id: string;
        phase: string;
        pct: number;
        detail?: string;
        updatedAt: number;
    };
    checkConfig(): {
        ok: boolean;
        hasKey: boolean;
        model: string;
        baseURL: string | null;
    };
    selfTest(): Promise<{
        ok: boolean;
        content: string;
        error?: undefined;
    } | {
        ok: boolean;
        error: any;
        content?: undefined;
    }>;
}
