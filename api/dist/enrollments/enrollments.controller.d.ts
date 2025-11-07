import { EnrollmentsService } from './enrollments.service';
import type { CreateEnrollmentDto } from './enrollments.service';
export declare class EnrollmentsController {
    private readonly enrollments;
    constructor(enrollments: EnrollmentsService);
    create(dto: CreateEnrollmentDto): Promise<import("../entities/enrollment.entity").Enrollment>;
    listByStudent(studentId: string): Promise<import("../entities/enrollment.entity").Enrollment[]>;
    listByClass(classId: string): Promise<import("../entities/enrollment.entity").Enrollment[]>;
    listRecent(limit?: string): Promise<import("../entities/enrollment.entity").Enrollment[]>;
    remove(id: string): Promise<void>;
}
