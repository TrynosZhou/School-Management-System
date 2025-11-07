import { Controller, Post, Body, Get, UseGuards, Req, Headers } from '@nestjs/common';
import { BearerGuard } from './bearer.guard';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService, private readonly jwt: JwtService) {}

  @Post('register')
  async register(@Body() registerDTO: RegisterDto) {
    return this.authService.register(registerDTO);
  }

  @Post('register-parent')
  async registerParent(@Body() body: RegisterDto) {
    return this.authService.registerParent({ email: body.email, password: body.password, fullName: body.fullName ?? null, contactNumber: body.contactNumber ?? null });
  }

  @Post('login')
  async login(@Body() loginDTO: LoginDto) {
    return this.authService.login(loginDTO);
  }

  @UseGuards(BearerGuard)
  @Get('me')
  me(@Req() req: any) {
    return req.user;
  }

  // TEMP: debug endpoint to verify token validity
  @Get('token-check')
  async tokenCheck(@Headers('authorization') auth?: string) {
    if (!auth?.startsWith('Bearer ')) return { ok: false, error: 'No bearer token' };
    const token = auth.substring('Bearer '.length);
    try {
      const payload = await this.jwt.verifyAsync(token);
      return { ok: true, payload };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'verify failed' };
    }
  }
}
