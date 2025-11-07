import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
export interface CreateUserInput {
    email: string;
    password: string;
    role?: string;
    fullName?: string | null;
    contactNumber?: string | null;
}
export declare class UsersService {
    private readonly repo;
    constructor(repo: Repository<User>);
    create(input: CreateUserInput): Promise<User>;
    list(): Promise<User[]>;
    findByEmail(email: string): Promise<User | null>;
    findById(id: string): Promise<User | null>;
    resetPasswordByEmail(email: string, newPassword: string): Promise<{
        success: true;
    }>;
    update(id: string, partial: Partial<Pick<User, 'fullName' | 'contactNumber' | 'role' | 'status'>>): Promise<User>;
    remove(id: string): Promise<void>;
}
