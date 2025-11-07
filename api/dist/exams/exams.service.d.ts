import { Repository } from 'typeorm';
import { ExamEntity } from './exam.entity';
export declare class ExamsService {
    private readonly exams;
    constructor(exams: Repository<ExamEntity>);
    list(filters?: {
        classId?: string;
        subjectId?: string;
        from?: string;
        to?: string;
        q?: string;
    }): Promise<ExamEntity[]>;
    create(body: {
        name: string;
        term?: string;
        academicYear?: string;
        subjectId?: string;
        classId?: string;
        date?: string;
        time?: string;
        venue?: string;
        invigilator1Id?: string;
        invigilator2Id?: string;
        status?: string;
        notes?: string;
    }): Promise<ExamEntity>;
    exportCsv(filters?: {
        classId?: string;
        subjectId?: string;
        from?: string;
        to?: string;
        q?: string;
    }): Promise<string>;
    finalize(id: string): Promise<ExamEntity>;
}
