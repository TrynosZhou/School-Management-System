import { Repository } from 'typeorm';
import { ParentStudent } from './parent-student.entity';
import { ParentLinkToken } from './parent-link-token.entity';
import { Student } from '../entities/student.entity';
import { User } from '../entities/user.entity';
export declare class ParentsService {
    private readonly links;
    private readonly students;
    private readonly tokens;
    private readonly users;
    constructor(links: Repository<ParentStudent>, students: Repository<Student>, tokens: Repository<ParentLinkToken>, users: Repository<User>);
    private emitter;
    onChange(listener: (payload: any) => void): () => void;
    private emitChange;
    linkStudent(parentUserId: string, studentIdOrCode: string, dob?: string, lastName?: string): Promise<any>;
    adminLink(parentUserId: string, studentIdOrCode: string): Promise<{
        ok: true;
    }>;
    adminUnlink(parentUserId: string, studentIdOrCode: string): Promise<{
        ok: true;
    }>;
    adminDeleteParent(parentUserId: string): Promise<{
        ok: true;
    }>;
    myStudents(parentUserId: string): Promise<Array<{
        id: string;
        studentId?: string | null;
        firstName: string;
        lastName: string;
        balance?: number;
    }>>;
    isLinked(parentUserId: string, studentId: string): Promise<boolean>;
    parentEmailsForStudents(studentIds: string[]): Promise<string[]>;
    parentEmailsAll(): Promise<string[]>;
    adminParentsWithLinks(): Promise<Array<{
        parentId: string;
        parentFullName: string | null;
        parentEmail: string | null;
        parentContactNumber: string | null;
        studentId: string;
        studentCode: string | null;
        studentFullName: string;
    }>>;
    adminParentsAllFlat(): Promise<Array<{
        parentId: string;
        parentFullName: string | null;
        parentEmail: string | null;
        parentContactNumber: string | null;
        studentId: string | null;
        studentCode: string | null;
        studentFullName: string | null;
    }>>;
    unlink(parentUserId: string, studentIdOrCode: string): Promise<{
        ok: true;
    }>;
    softDeleteStudent(parentUserId: string, studentIdOrCode: string): Promise<{
        ok: true;
    }>;
    createInvite(studentId: string, expiresAt?: string): Promise<{
        code: string;
    }>;
    redeemInvite(parentUserId: string, code: string): Promise<{
        ok: boolean;
    }>;
    listLinkedParents(studentIdOrCode: string): Promise<Array<{
        id: string;
        email: string;
    }>>;
    migrateParentLinks(): Promise<{
        ok: boolean;
        migrated: number;
        message: string;
    }>;
}
