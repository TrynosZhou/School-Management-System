import { AttendanceService } from './attendance.service';
import type { RecordAttendanceDto } from './attendance.service';
import { Repository } from 'typeorm';
import { ClassEntity } from '../entities/class.entity';
export declare class AttendanceController {
    private readonly svc;
    private readonly classesRepo;
    constructor(svc: AttendanceService, classesRepo: Repository<ClassEntity>);
    record(body: RecordAttendanceDto, req: any): Promise<import("../entities/attendance.entity").Attendance>;
    list(studentId?: string, term?: string, from?: string, to?: string): Promise<import("../entities/attendance.entity").Attendance[]>;
    summary(studentId: string, term?: string, from?: string, to?: string): Promise<{
        total: number;
        present: number;
    }>;
    presentCount(date: string): Promise<number>;
}
