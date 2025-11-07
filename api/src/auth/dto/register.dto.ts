import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  role?: string; // admin | teacher | student | parent

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  contactNumber?: string;
}
