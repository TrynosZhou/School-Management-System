import type { Response } from 'express';
import { ExamsService } from './exams.service';
export declare class ExamsController {
    private readonly svc;
    constructor(svc: ExamsService);
    list(classId?: string, subjectId?: string, from?: string, to?: string, q?: string): Promise<import("./exam.entity").ExamEntity[]>;
    create(body: any): Promise<import("./exam.entity").ExamEntity>;
    exportCsv(res: Response, classId?: string, subjectId?: string, from?: string, to?: string, q?: string): Promise<void>;
    finalize(id: string): Promise<import("./exam.entity").ExamEntity>;
}
