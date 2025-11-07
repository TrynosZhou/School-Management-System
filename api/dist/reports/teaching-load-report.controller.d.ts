import type { Response } from 'express';
import { Repository } from 'typeorm';
import { Teacher } from '../entities/teacher.entity';
import { ClassEntity } from '../entities/class.entity';
import { Subject } from '../entities/subject.entity';
import { TeachingAssignment } from '../teaching/teaching-assignment.entity';
export declare class TeachingLoadReportController {
    private readonly teachers;
    private readonly assignments;
    private readonly classes;
    private readonly subjects;
    constructor(teachers: Repository<Teacher>, assignments: Repository<TeachingAssignment>, classes: Repository<ClassEntity>, subjects: Repository<Subject>);
    private buildData;
    json(): Promise<{
        teacher: {
            id: string;
            name: string;
            email: string;
        };
        items: Array<{
            className: string;
            subjectName: string;
            periods: number;
        }>;
        total: number;
    }[]>;
    csv(res: Response): Promise<void>;
    pdf(res: Response): Promise<void>;
}
