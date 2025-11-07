import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
export declare class AuthController {
    private readonly authService;
    private readonly jwt;
    constructor(authService: AuthService, jwt: JwtService);
    register(registerDTO: RegisterDto): Promise<{
        user: {
            id: string;
            email: string;
            role: string | undefined;
            fullName: string | null;
        };
        access_token: string;
    }>;
    registerParent(body: RegisterDto): Promise<{
        user: {
            id: string;
            email: string;
            role: string | undefined;
            fullName: string | null;
        };
        access_token: string;
    }>;
    login(loginDTO: LoginDto): Promise<{
        user: {
            id: string;
            email: string;
            role: string | undefined;
            fullName: string | null;
        };
        access_token: string;
    }>;
    me(req: any): any;
    tokenCheck(auth?: string): Promise<{
        ok: boolean;
        payload: any;
        error?: undefined;
    } | {
        ok: boolean;
        error: any;
        payload?: undefined;
    }>;
}
