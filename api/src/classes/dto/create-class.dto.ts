import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateClassDto {
  @IsString()
  @MaxLength(150)
  name: string;

  @IsString()
  @MaxLength(50)
  gradeLevel: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  academicYear?: string; // e.g., 2025-2026

  @IsOptional()
  @IsString()
  teacherId?: string;
}
