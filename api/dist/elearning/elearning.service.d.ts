export declare class ElearningService {
    private resources;
    private submissions;
    private tests;
    private ocrImageFallback;
    private ocrPdfFallback;
    private progress;
    private setProgress;
    getProgress(id: string): {
        id: string;
        phase: string;
        pct: number;
        detail?: string;
        updatedAt: number;
    };
    checkAiConfig(): {
        ok: boolean;
        hasKey: boolean;
        model: string;
        baseURL: string | null;
    };
    signup(role: 'student' | 'teacher', body: any): {
        ok: boolean;
        role: "student" | "teacher";
        email: any;
    };
    login(role: 'student' | 'teacher', body: any): {
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
    listResources(filter?: {
        role?: string;
        classRef?: string;
        now?: number;
    }): {
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
    listSubmissions(filter?: {
        role?: string;
        classRef?: string;
    }): {
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
    generateAiTest(input: {
        subject: string;
        classRef: string;
        syllabusCode: string;
        total: number;
        jobId?: string;
    }): Promise<{
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
    removeTest(id: string): any;
    markPaper(file: any): {
        ok: boolean;
        score: number;
        total: number;
        summary: string;
    };
    buildBank(input: {
        syllabusCode: string;
        subject?: string;
        classRef?: string;
        jobId?: string;
        heuristicOnly?: boolean;
    }, files: Array<{
        path: string;
        originalname?: string;
        mimetype?: string;
    }>): Promise<{
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
