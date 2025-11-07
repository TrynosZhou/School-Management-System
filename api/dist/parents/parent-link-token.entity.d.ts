import { Student } from '../entities/student.entity';
export declare class ParentLinkToken {
    id: string;
    student: Student;
    code: string;
    expiresAt: Date | null;
    usedAt: Date | null;
    createdAt: Date;
}
