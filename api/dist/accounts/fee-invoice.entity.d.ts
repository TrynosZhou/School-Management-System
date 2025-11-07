import { Student } from '../entities/student.entity';
export type InvoiceStatus = 'unpaid' | 'partially_paid' | 'paid';
export declare class FeeInvoice {
    id: string;
    student: Student;
    term: string;
    academicYear: string;
    amount: string;
    description?: string | null;
    status: InvoiceStatus;
    createdAt: Date;
}
