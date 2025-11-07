import { Repository } from 'typeorm';
import { Enrollment } from '../entities/enrollment.entity';
import { Student } from '../entities/student.entity';
import { ClassEntity } from '../entities/class.entity';
export interface CreateEnrollmentDto {
    studentId: string;
    classId: string;
    startDate?: string | null;
    status?: 'active' | 'completed' | 'withdrawn';
}
export declare class EnrollmentsService {
    private readonly enrollRepo;
    private readonly studentRepo;
    private readonly classRepo;
    constructor(enrollRepo: Repository<Enrollment>, studentRepo: Repository<Student>, classRepo: Repository<ClassEntity>);
    create(dto: CreateEnrollmentDto): Promise<Enrollment>;
    listByStudent(studentId: string): Promise<Enrollment[]>;
    listByClass(classId: string): Promise<Enrollment[]>;
    listRecent(limit?: number): Promise<Enrollment[]>;
    remove(id: string): Promise<void>;
}
