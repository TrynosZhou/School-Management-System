import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
export interface RegisterDto {
    email: string;
    password: string;
    role?: string;
    fullName?: string | null;
    contactNumber?: string | null;
}
export interface LoginDto {
    email: string;
    password: string;
}
export declare class AuthService {
    private readonly users;
    private readonly jwt;
    constructor(users: UsersService, jwt: JwtService);
    register(dto: RegisterDto): Promise<{
        user: {
            id: string;
            email: string;
            role: string | undefined;
            fullName: string | null;
        };
        access_token: string;
    }>;
    registerParent(dto: {
        email: string;
        password: string;
        fullName?: string | null;
        contactNumber?: string | null;
    }): Promise<{
        user: {
            id: string;
            email: string;
            role: string | undefined;
            fullName: string | null;
        };
        access_token: string;
    }>;
    login(dto: LoginDto): Promise<{
        user: {
            id: string;
            email: string;
            role: string | undefined;
            fullName: string | null;
        };
        access_token: string;
    }>;
    private buildAuthResponse;
}
