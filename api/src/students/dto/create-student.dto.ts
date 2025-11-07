import { IsEmail, IsIn, IsOptional, IsString, IsDateString, MaxLength, IsBoolean } from 'class-validator';

export class CreateStudentDto {
  @IsString()
  @MaxLength(100)
  firstName: string;

  @IsString()
  @MaxLength(100)
  lastName: string;

  @IsOptional()
  @IsEmail()
  email?: string | null;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsDateString()
  dob?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nationality?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  religion?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  nextOfKin?: string | null;

  @IsOptional()
  @IsString()
  @IsIn(['male', 'female', 'other'])
  gender?: string | null;

  @IsString()
  @IsIn(['day', 'boarder'])
  boardingStatus: 'day' | 'boarder';

  @IsOptional()
  @IsString()
  @MaxLength(30)
  contactNumber?: string | null;

  @IsOptional()
  @IsBoolean()
  isStaffChild?: boolean;

  @IsOptional()
  @IsBoolean()
  takesMeals?: boolean;

  @IsOptional()
  @IsBoolean()
  takesTransport?: boolean;
}
