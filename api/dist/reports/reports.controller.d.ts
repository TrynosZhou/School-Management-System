import { Repository } from 'typeorm';
import { Student } from '../entities/student.entity';
import { Mark } from '../marks/mark.entity';
import type { Response } from 'express';
import { AccountsService } from '../accounts/accounts.service';
import { Settings } from '../settings/settings.entity';
import { ReportRemark } from './report-remark.entity';
import { Attendance } from '../entities/attendance.entity';
import { Enrollment } from '../entities/enrollment.entity';
import { ParentsService } from '../parents/parents.service';
import { EmailService } from '../email/email.service';
export declare class ReportsController {
    private readonly students;
    private readonly marks;
    private readonly settingsRepo;
    private readonly remarksRepo;
    private readonly attendanceRepo;
    private readonly enrollRepo;
    private readonly parentsSvc;
    private readonly email;
    private readonly accounts;
    constructor(students: Repository<Student>, marks: Repository<Mark>, settingsRepo: Repository<Settings>, remarksRepo: Repository<ReportRemark>, attendanceRepo: Repository<Attendance>, enrollRepo: Repository<Enrollment>, parentsSvc: ParentsService, email: EmailService, accounts: AccountsService);
    private fetchImageBuffer;
    reportCard(req: any, studentIdParam: string, term: string | undefined, res: Response): Promise<void>;
    reportCardViewer(studentIdParam: string, term: string | undefined, res: Response): Promise<void>;
    studentIdCard(studentIdParam: string, res: Response): Promise<void>;
    honoursByGradeJson(gradeLevel: string, term: string, examType: string, academicYear?: string, stream?: string, res?: Response): Promise<void>;
    honoursByGradeCsv(gradeLevel: string, term: string, examType: string, academicYear?: string, stream?: string, res?: Response): Promise<void>;
    parentReportCard(req: any, studentIdParam: string, term: string | undefined, res: Response): Promise<void>;
    publish(body: {
        term: string;
        classId?: string;
        suppressArrears?: boolean;
    }): Promise<{
        ok: boolean;
        error: string;
        sent?: undefined;
        suppressed?: undefined;
        withheld?: undefined;
    } | {
        ok: boolean;
        sent: number;
        suppressed: number;
        withheld: number;
        error?: undefined;
    }>;
    marksheetPdf(classId: string, term: string, res: Response): Promise<void>;
    marksheetCsv(classId: string, term: string, res: Response): Promise<void>;
    marksheetJson(classId: string, term: string): Promise<{
        error: string;
        classId?: undefined;
        term?: undefined;
        subjects?: undefined;
        students?: undefined;
        scores?: undefined;
        passed?: undefined;
        passMark?: undefined;
    } | {
        classId: string;
        term: string;
        subjects: {
            id: string;
            code: string;
            name: string;
        }[];
        students: {
            id: string;
            code: string;
            name: string;
        }[];
        scores: Record<string, Record<string, string>>;
        passed: Record<string, number>;
        passMark: number;
        error?: undefined;
    }>;
    honoursJson(classId: string, term: string, topNStr: string | undefined, res: Response): Promise<void>;
    honoursCsv(classId: string, term: string, topNStr: string | undefined, res: Response): Promise<void>;
    honoursPdf(classId: string, term: string, topNStr: string | undefined, res: Response): Promise<void>;
    debugRemarks(studentId: string): Promise<{
        id: string;
        term: string | null | undefined;
        examType: string | null | undefined;
        teacherRemark: string;
        principalRemark: string;
        status: string | null | undefined;
        updatedAt: Date;
    }[]>;
    getRemarks(studentId: string, term?: string, examType?: string): Promise<{}>;
    saveRemarks(body: {
        studentId: string;
        term?: string;
        examType?: string;
        teacherRemark?: string;
        principalRemark?: string;
    }): Promise<{
        ok: boolean;
        error: string;
        id?: undefined;
        status?: undefined;
    } | {
        ok: boolean;
        id: string;
        status: string | null | undefined;
        error?: undefined;
    }>;
    tuitionReceiptPdf(body: {
        studentId?: string;
        studentName?: string;
        address?: string;
        receiptNo?: string;
        date?: string;
        paymentMethod?: string;
        issuedBy?: string;
        phone?: string;
        items?: Array<{
            description: string;
            quantity?: number;
            unitPrice?: number;
            taxRate?: number;
        }>;
    }, res: Response): Promise<void>;
    publishReports(body: {
        classId: string;
        term: string;
        examType?: string;
    }, res: Response): Promise<void>;
}
