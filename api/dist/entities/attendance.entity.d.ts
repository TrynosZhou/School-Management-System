import { Student } from './student.entity';
import { ClassEntity } from './class.entity';
export declare class Attendance {
    id: string;
    student: Student;
    klass?: ClassEntity | null;
    date: string;
    term?: string | null;
    present: boolean;
    createdAt: Date;
    updatedAt: Date;
}
