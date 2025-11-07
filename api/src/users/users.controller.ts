import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { BearerGuard } from '../auth/bearer.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserStatus } from '../entities/user.entity';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  // Admin: list users
  @UseGuards(BearerGuard, RolesGuard)
  @Roles('admin')
  @Get()
  list(){
    return this.users.list();
  }

  // Admin: create user
  @UseGuards(BearerGuard, RolesGuard)
  @Roles('admin')
  @Post()
  create(@Body() body: { email: string; password: string; role?: string; fullName?: string | null; contactNumber?: string | null }){
    return this.users.create(body);
  }

  // Admin: reset a user's password by email
  @UseGuards(BearerGuard, RolesGuard)
  @Roles('admin')
  @Post('reset-password')
  resetPassword(@Body() body: { email: string; newPassword: string }) {
    return this.users.resetPasswordByEmail(body?.email, body?.newPassword);
  }

  // Admin: update user fields
  @UseGuards(BearerGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id')
  update(@Param('id') id: string, @Body() partial: { fullName?: string | null; contactNumber?: string | null; role?: string; status?: UserStatus }){
    return this.users.update(id, partial);
  }

  // Admin: delete user
  @UseGuards(BearerGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string){
    return this.users.remove(id);
  }
}
