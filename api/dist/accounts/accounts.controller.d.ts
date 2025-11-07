import { AccountsService } from './accounts.service';
import type { Response } from 'express';
import { Repository } from 'typeorm';
import { Settings } from '../settings/settings.entity';
import { AccountSettings } from '../accounts/account-settings.entity';
import { Student } from '../entities/student.entity';
import { FeeInvoice } from './fee-invoice.entity';
import { Enrollment } from '../entities/enrollment.entity';
export declare class AccountsController {
    private readonly svc;
    private readonly settingsRepo;
    private readonly accSettingsRepo;
    private readonly studentsRepo;
    private readonly invoicesRepo;
    private readonly enrollmentsRepo;
    constructor(svc: AccountsService, settingsRepo: Repository<Settings>, accSettingsRepo: Repository<AccountSettings>, studentsRepo: Repository<Student>, invoicesRepo: Repository<FeeInvoice>, enrollmentsRepo: Repository<Enrollment>);
    getSettings(): Promise<AccountSettings>;
    updateSettings(body: any): Promise<AccountSettings>;
    bulk(body: {
        term?: string;
        academicYear?: string;
        amount?: string;
        description?: string;
    }): Promise<any>;
    listBalances(): Promise<{
        studentId: string;
        studentName: string;
        studentCode: string;
        balance: number;
    }[]>;
    transportUsers(): Promise<{
        id: string;
        studentId?: string | null;
        firstName: string;
        lastName: string;
        contactNumber?: string | null;
        gender?: string | null;
        className?: string | null;
    }[]>;
    balancesCsv(download: string | undefined, res: Response): Promise<void>;
    termEnd(body: {
        term?: string;
    }): Promise<{
        success: boolean;
        termClosed: string | null | undefined;
    }>;
    yearEnd(body: {
        academicYear?: string;
    }): Promise<{
        success: boolean;
        yearClosed: string | null | undefined;
    }>;
    recordPayment(body: {
        studentIdOrCode: string;
        amount: string;
        note?: string;
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
    reconcileInvoices(studentIdOrCode: string, body?: {
        term?: string;
    }): Promise<{
        success: boolean;
        message: string;
        settled: number;
    }>;
    normalize(body: {
        term: string;
        academicYear: string;
    }): Promise<{
        normalized: number;
    }>;
    bulkByClass(body: {
        classId: string;
        term?: string;
        academicYear?: string;
        amount?: string;
        description?: string;
    }): Promise<any>;
    getBalance(idOrCode: string): Promise<{
        student: {
            id: string;
            name: string;
            code: string;
        };
        balance: number;
        invoices: FeeInvoice[];
        transactions: import("./fee-transaction.entity").FeeTransaction[];
    }>;
    getTermBalance(idOrCode: string, term: string): Promise<any>;
    publicBalance(studentId: string): Promise<{
        student: {
            id: string;
            name: string;
            code: string;
        };
        balance: number;
        invoices: FeeInvoice[];
        transactions: import("./fee-transaction.entity").FeeTransaction[];
    }>;
    invoicePdf(idOrCode: string, res: Response): Promise<void>;
    recent(limit?: number, from?: string, to?: string, method?: string): Promise<import("./fee-transaction.entity").FeeTransaction[]>;
    receipt(txId: string, res: Response): Promise<void>;
}
