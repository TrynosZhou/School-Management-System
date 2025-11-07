import { Repository } from 'typeorm';
import { Student } from '../entities/student.entity';
import { Teacher } from '../entities/teacher.entity';
import { ClassEntity } from '../entities/class.entity';
import { Enrollment } from '../entities/enrollment.entity';
export declare class StatsController {
    private readonly students;
    private readonly teachers;
    private readonly classes;
    private readonly enrollments;
    constructor(students: Repository<Student>, teachers: Repository<Teacher>, classes: Repository<ClassEntity>, enrollments: Repository<Enrollment>);
    getCounts(): Promise<{
        students: number;
        teachers: number;
        classes: number;
    }>;
    admissionsTrend(): Promise<{
        month: string;
        count: number;
    }[]>;
    enrollmentsTrend(): Promise<{
        month: string;
        count: number;
    }[]>;
}
