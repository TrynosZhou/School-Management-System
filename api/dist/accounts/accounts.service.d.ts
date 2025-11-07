import { Repository } from 'typeorm';
import { Settings } from '../settings/settings.entity';
import { AccountSettings } from './account-settings.entity';
import { StudentAccount } from './student-account.entity';
import { FeeInvoice } from './fee-invoice.entity';
import { FeeTransaction } from './fee-transaction.entity';
import { Student } from '../entities/student.entity';
import { Enrollment } from '../entities/enrollment.entity';
export declare class AccountsService {
    private readonly settings;
    private readonly accounts;
    private readonly invoices;
    private readonly tx;
    private readonly students;
    private readonly enrollments;
    private readonly settingsRepo;
    constructor(settings: Repository<AccountSettings>, accounts: Repository<StudentAccount>, invoices: Repository<FeeInvoice>, tx: Repository<FeeTransaction>, students: Repository<Student>, enrollments: Repository<Enrollment>, settingsRepo: Repository<Settings>);
    getSettings(): Promise<AccountSettings>;
    updateSettings(partial: Partial<AccountSettings>): Promise<AccountSettings>;
    private getOrCreateStudentAccount;
    bulkGenerateInvoices(term?: string, academicYear?: string, amount?: string, description?: string): Promise<any>;
    listBalances(): Promise<{
        studentId: string;
        studentName: string;
        studentCode: string;
        balance: number;
    }[]>;
    getStudentBalanceById(studentId: string): Promise<{
        student: {
            id: string;
            name: string;
            code: string;
        };
        balance: number;
        invoices: FeeInvoice[];
        transactions: FeeTransaction[];
    }>;
    getStudentTermBalanceById(studentId: string, term?: string, academicYear?: string): Promise<any>;
    termEndUpdate(targetTerm?: string): Promise<{
        success: boolean;
        termClosed: string | null | undefined;
    }>;
    yearEndUpdate(targetYear?: string): Promise<{
        success: boolean;
        yearClosed: string | null | undefined;
    }>;
    recordPayment(studentIdOrCode: string, amount: string, note?: string, opts?: {
        receiptNumber?: string;
        method?: string;
        reference?: string;
        receivedAt?: string;
        term?: string;
        academicYear?: string;
    }): Promise<{
        success: boolean;
        balance: number;
        receiptNumber: string;
        id: string;
    }>;
    bulkGenerateInvoicesByClass(classId: string, term?: string, academicYear?: string, amount?: string, description?: string): Promise<any>;
    exportBalancesCsv(): Promise<string>;
    getTransaction(txId: string): Promise<FeeTransaction>;
    recentPayments(limit?: number, opts?: {
        from?: string;
        to?: string;
        method?: string;
    }): Promise<FeeTransaction[]>;
    normalizeInvoicesForTermYear(term: string, academicYear: string): Promise<{
        normalized: number;
    }>;
    reconcileInvoices(studentIdOrCode: string, term?: string): Promise<{
        success: boolean;
        message: string;
        settled: number;
    }>;
}
