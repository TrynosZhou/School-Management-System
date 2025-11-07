import type { Response } from 'express';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
export declare class StudentsController {
    private readonly students;
    constructor(students: StudentsService);
    create(dto: CreateStudentDto): Promise<import("../entities/student.entity").Student>;
    findAll(page?: number, limit?: number): Promise<{
        data: import("../entities/student.entity").Student[];
        total: number;
        page: number;
        limit: number;
    }>;
    getPhoto(id: string, res: Response): Promise<void>;
    findOne(id: string): Promise<import("../entities/student.entity").Student>;
    findByStudentId(studentId: string): Promise<import("../entities/student.entity").Student>;
    update(id: string, partial: Partial<CreateStudentDto>): Promise<import("../entities/student.entity").Student>;
    remove(id: string): Promise<void>;
    backfill(): Promise<{
        updated: number;
        start?: string;
        end?: string;
    }>;
    uploadPhoto(id: string, file?: any): Promise<{
        success: boolean;
    }>;
}
