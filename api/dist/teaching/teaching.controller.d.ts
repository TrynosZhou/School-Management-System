import { Repository } from 'typeorm';
import { TeachingAssignment } from './teaching-assignment.entity';
import { Teacher } from '../entities/teacher.entity';
import { ClassEntity } from '../entities/class.entity';
import { Subject } from '../entities/subject.entity';
declare class CreateAssignmentDto {
    teacherId: string;
    classId: string;
    subjectId?: string | null;
    status: 'active' | 'inactive';
}
export declare class TeachingController {
    private readonly assignments;
    private readonly teachers;
    private readonly classes;
    private readonly subjects;
    constructor(assignments: Repository<TeachingAssignment>, teachers: Repository<Teacher>, classes: Repository<ClassEntity>, subjects: Repository<Subject>);
    assign(dto: CreateAssignmentDto): Promise<{
        success: boolean;
        message: string;
        id?: undefined;
    } | {
        success: boolean;
        id: string;
        message?: undefined;
    }>;
    listForClass(classId: string): Promise<TeachingAssignment[]>;
    listForTeacher(teacherId: string): Promise<TeachingAssignment[]>;
    listClassesForTeacher(teacherId: string): Promise<string[]>;
    unassign(body: {
        teacherId: string;
        classId: string;
    }): Promise<{
        success: boolean;
        message: string;
        removed?: undefined;
    } | {
        success: boolean;
        removed: number;
        message?: undefined;
    }>;
    unassignOne(body: {
        teacherId: string;
        classId: string;
        subjectId: string;
    }): Promise<{
        success: boolean;
        message: string;
        removed?: undefined;
    } | {
        success: boolean;
        removed: number;
        message?: undefined;
    }>;
    listMine(req: any): Promise<TeachingAssignment[]>;
    ensureCurrentTeacher(req: any): Promise<Teacher>;
}
export {};
