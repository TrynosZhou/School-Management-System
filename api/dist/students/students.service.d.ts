import { Repository } from 'typeorm';
import { Student } from '../entities/student.entity';
import { CreateStudentDto } from './dto/create-student.dto';
import { FeeInvoice } from '../accounts/fee-invoice.entity';
import { FeeTransaction } from '../accounts/fee-transaction.entity';
import { StudentAccount } from '../accounts/student-account.entity';
import { AccountSettings } from '../accounts/account-settings.entity';
import { Settings } from '../settings/settings.entity';
export declare class StudentsService {
    private readonly repo;
    private readonly invoices;
    private readonly tx;
    private readonly accounts;
    private readonly accSettings;
    private readonly settings;
    constructor(repo: Repository<Student>, invoices: Repository<FeeInvoice>, tx: Repository<FeeTransaction>, accounts: Repository<StudentAccount>, accSettings: Repository<AccountSettings>, settings: Repository<Settings>);
    create(dto: CreateStudentDto): Promise<Student>;
    findAll(page?: number, limit?: number): Promise<{
        data: Student[];
        total: number;
        page: number;
        limit: number;
    }>;
    findOne(id: string): Promise<Student>;
    findByIdOrCode(idOrCode: string): Promise<Student>;
    findByStudentId(studentId: string): Promise<Student>;
    update(id: string, partial: Partial<CreateStudentDto>): Promise<Student>;
    remove(id: string): Promise<void>;
    backfillStudentIds(): Promise<{
        updated: number;
        start?: string;
        end?: string;
    }>;
}
