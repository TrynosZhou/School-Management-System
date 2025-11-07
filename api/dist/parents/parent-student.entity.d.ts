import { User } from '../entities/user.entity';
import { Student } from '../entities/student.entity';
export declare class ParentStudent {
    id: string;
    parent: User;
    student: Student;
    createdAt: Date;
}
