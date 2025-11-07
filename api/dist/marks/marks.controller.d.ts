import { Repository } from 'typeorm';
import { Mark } from './mark.entity';
import { Student } from '../entities/student.entity';
import { ClassEntity } from '../entities/class.entity';
import { Subject } from '../entities/subject.entity';
import { TeachingAssignment } from '../teaching/teaching-assignment.entity';
import { Teacher } from '../entities/teacher.entity';
import { Settings } from '../settings/settings.entity';
declare class CaptureEntryDto {
    studentId: string;
    score: string;
    comment?: string | null;
}
declare class CaptureMarksDto {
    session: string;
    classId: string;
    subjectId?: string;
    examType?: string;
    entries: CaptureEntryDto[];
}
export declare class MarksController {
    private readonly marks;
    private readonly students;
    private readonly classes;
    private readonly subjects;
    private readonly assignments;
    private readonly teachers;
    private readonly settingsRepo;
    constructor(marks: Repository<Mark>, students: Repository<Student>, classes: Repository<ClassEntity>, subjects: Repository<Subject>, assignments: Repository<TeachingAssignment>, teachers: Repository<Teacher>, settingsRepo: Repository<Settings>);
    capture(body: CaptureMarksDto, req: any): Promise<{
        success: boolean;
        message: string;
        saved?: undefined;
    } | {
        success: boolean;
        saved: number;
        message?: undefined;
    }>;
    listByClassSession(classId: string, session: string, req: any): Promise<Mark[]>;
    debugBands(): Promise<{
        rawJson: string | null | undefined;
        parsedBands: {
            grade: string;
            min: number;
            max: number;
        }[];
        defaultsWillBeUsed: boolean;
    }>;
    getMarksByStudent(studentId?: string, term?: string, examType?: string): Promise<Mark[]>;
    sessions(): Promise<string[]>;
    sessionsByClass(classId: string): Promise<string[]>;
    reportByClassSession(classId: string, session: string, req: any): Promise<{
        studentId: string;
        studentName: string;
        count: number;
        avg: number;
        min: number;
        max: number;
    }[]>;
    streamSubjectRankings(classId: string, term?: string, examTypeRaw?: string, req?: any): Promise<{
        term: string | null;
        examType: string | null;
        stream: {
            gradeLevel: any;
            academicYear: any;
            name: string | null;
        };
        subjects: {
            subjectId: string;
            subjectName: string;
            total: number;
            mean: number;
            rankings: {
                studentId: string;
                studentName: string;
                score: number;
                rank: number;
            }[];
        }[];
    }>;
    dedupe(req: any): Promise<{
        success: boolean;
        before: number;
        deleted: number;
        remaining: number;
    }>;
    recomputeGrades(req: any): Promise<any>;
    getGrades(req: any): Promise<{
        category: string;
        bands: {
            grade: string;
            min: number;
            max: number;
        }[];
    }[]>;
    saveGrades(body: Array<{
        category: string;
        bands: Array<{
            grade: string;
            min: number;
            max: number;
        }>;
    }>, req: any): Promise<{
        success: boolean;
        message: string;
    }>;
}
export {};
