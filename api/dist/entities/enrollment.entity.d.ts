import { Student } from './student.entity';
import { ClassEntity } from './class.entity';
export declare class Enrollment {
    id: string;
    student: Student;
    classEntity: ClassEntity;
    startDate?: string | null;
    status: 'active' | 'completed' | 'withdrawn';
    createdAt: Date;
    updatedAt: Date;
}
