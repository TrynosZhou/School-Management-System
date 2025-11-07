import { UsersService } from './users.service';
import { UserStatus } from '../entities/user.entity';
export declare class UsersController {
    private readonly users;
    constructor(users: UsersService);
    list(): Promise<import("../entities/user.entity").User[]>;
    create(body: {
        email: string;
        password: string;
        role?: string;
        fullName?: string | null;
        contactNumber?: string | null;
    }): Promise<import("../entities/user.entity").User>;
    resetPassword(body: {
        email: string;
        newPassword: string;
    }): Promise<{
        success: true;
    }>;
    update(id: string, partial: {
        fullName?: string | null;
        contactNumber?: string | null;
        role?: string;
        status?: UserStatus;
    }): Promise<import("../entities/user.entity").User>;
    remove(id: string): Promise<void>;
}
