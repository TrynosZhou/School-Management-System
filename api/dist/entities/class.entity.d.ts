import { Enrollment } from './enrollment.entity';
import { Teacher } from './teacher.entity';
export declare class ClassEntity {
    id: string;
    name: string;
    gradeLevel: string;
    academicYear: string;
    enrollments: Enrollment[];
    classTeacher?: Teacher | null;
    createdAt: Date;
    updatedAt: Date;
}
