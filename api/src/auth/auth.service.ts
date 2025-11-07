import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { User } from '../entities/user.entity';

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

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    if (!dto.email || !dto.password) throw new BadRequestException('email and password required');
    // Normalize and whitelist roles: 'admin', 'teacher', or 'student' allowed via self-registration
    const role = (dto.role || 'student').toLowerCase();
    const allowed = (role === 'admin' || role === 'teacher' || role === 'student') ? role : 'student';
    const user = await this.users.create({ email: dto.email, password: dto.password, role: allowed, fullName: dto.fullName ?? null });
    return this.buildAuthResponse(user);
  }

  async registerParent(dto: { email: string; password: string; fullName?: string | null; contactNumber?: string | null }) {
    if (!dto.email || !dto.password) throw new BadRequestException('email and password required');
    const user = await this.users.create({ email: dto.email, password: dto.password, role: 'parent', fullName: dto.fullName ?? null, contactNumber: dto.contactNumber ?? null });
    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto) {
    console.log('[LOGIN] Attempting login for email:', dto.email);
    const user = await this.users.findByEmail(dto.email);
    if (!user) {
      console.log('[LOGIN] ❌ User not found:', dto.email);
      throw new UnauthorizedException('Invalid credentials');
    }
    console.log('[LOGIN] ✓ User found:', { id: user.id, email: user.email, role: user.role });
    console.log('[LOGIN] Comparing password with hash (length):', user.passwordHash.length);
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      console.log('[LOGIN] ❌ Password mismatch for:', dto.email);
      throw new UnauthorizedException('Invalid credentials');
    }
    console.log('[LOGIN] ✓ Password match, login successful');
    return this.buildAuthResponse(user);
  }

  private async buildAuthResponse(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role, fullName: user.fullName ?? null } as any;
    const access_token = await this.jwt.signAsync(payload);
    return { user: { id: user.id, email: user.email, role: user.role, fullName: user.fullName ?? null }, access_token };
  }
}
