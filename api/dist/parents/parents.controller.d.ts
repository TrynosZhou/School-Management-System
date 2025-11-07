import { ParentsService } from './parents.service';
import { EmailService } from '../email/email.service';
import { JwtService } from '@nestjs/jwt';
export declare class ParentsController {
    private readonly parents;
    private readonly email;
    private readonly jwt;
    constructor(parents: ParentsService, email: EmailService, jwt: JwtService);
    link(req: any, body: {
        studentIdOrCode: string;
        lastName: string;
        dob?: string;
    }): Promise<any>;
    myStudents(req: any): Promise<{
        id: string;
        studentId?: string | null;
        firstName: string;
        lastName: string;
        balance?: number;
    }[]>;
    unlink(req: any, studentId: string): Promise<{
        ok: true;
    }>;
    unlinkDeleteBody(req: any, body: {
        studentId?: string;
        studentIdOrCode?: string;
    }): Promise<{
        ok: true;
    }>;
    unlinkPost(req: any, body: {
        studentId?: string;
        studentIdOrCode?: string;
    }): Promise<{
        ok: true;
    }>;
    softDelete(req: any, body: {
        studentId?: string;
        studentIdOrCode?: string;
    }): Promise<{
        ok: true;
    }>;
    redeem(req: any, body: {
        code: string;
    }): Promise<{
        ok: boolean;
    }>;
    createInvite(req: any, body: {
        studentId: string;
        expiresAt?: string;
    }): Promise<{
        code: string;
    }>;
    listLinked(req: any, studentId: string): Promise<{
        id: string;
        email: string;
    }[]>;
    adminParentsWithLinks(req: any): Promise<{
        parentId: string;
        parentFullName: string | null;
        parentEmail: string | null;
        parentContactNumber: string | null;
        studentId: string;
        studentCode: string | null;
        studentFullName: string;
    }[]>;
    adminParentsAll(req: any): Promise<{
        parentId: string;
        parentFullName: string | null;
        parentEmail: string | null;
        parentContactNumber: string | null;
        studentId: string | null;
        studentCode: string | null;
        studentFullName: string | null;
    }[]>;
    adminLink(req: any, body: {
        parentId: string;
        studentIdOrCode: string;
    }): Promise<void>;
    adminUnlink(req: any, body: {
        parentId: string;
        studentId: string;
    }): Promise<{
        ok: true;
    }>;
    adminDeleteParent(req: any, body: {
        parentId: string;
    }): Promise<{
        ok: true;
    }>;
    migrateLinks(req: any): Promise<{
        ok: boolean;
        migrated: number;
        message: string;
    }>;
    bulkEmail(req: any, body: {
        subject: string;
        html: string;
        studentIds?: string[];
    }): Promise<{
        ok: boolean;
        message: string;
        sent?: undefined;
        batches?: undefined;
    } | {
        ok: boolean;
        sent: number;
        batches: number;
        message?: undefined;
    }>;
    events(token: string, res: any): Promise<void>;
}
