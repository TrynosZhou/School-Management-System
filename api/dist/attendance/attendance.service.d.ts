import { Repository } from 'typeorm';
import { Attendance } from '../entities/attendance.entity';
import { Student } from '../entities/student.entity';
import { ClassEntity } from '../entities/class.entity';
export interface RecordAttendanceDto {
    studentId: string;
    classId?: string;
    date: string;
    term?: string;
    present: boolean;
}
export declare class AttendanceService {
    private readonly repo;
    private readonly students;
    private readonly classes;
    constructor(repo: Repository<Attendance>, students: Repository<Student>, classes: Repository<ClassEntity>);
    record(dto: RecordAttendanceDto): Promise<Attendance>;
    list(studentId?: string, term?: string, fromDate?: string, toDate?: string): Promise<Attendance[]>;
    summary(studentId: string, term?: string, fromDate?: string, toDate?: string): Promise<{
        total: number;
        present: number;
    }>;
    presentCount(date: string): Promise<number>;
}
