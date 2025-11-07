import { Student } from '../entities/student.entity';
export type TransactionType = 'invoice' | 'payment' | 'adjustment';
export declare class FeeTransaction {
    id: string;
    student: Student;
    type: TransactionType;
    amount: string;
    term?: string | null;
    academicYear?: string | null;
    note?: string | null;
    receiptNumber?: string | null;
    method?: string | null;
    reference?: string | null;
    receivedAt?: string | null;
    createdAt: Date;
}
