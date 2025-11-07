import { HrService } from './hr.service';
export declare class HrController {
    private readonly svc;
    constructor(svc: HrService);
    process(body: any): Promise<{
        ok: boolean;
        rows: any[];
        payslips: any[];
    }>;
    listDepartments(): import("./hr.service").Department[];
    createDepartment(body: any): any;
    listEmployees(): Promise<{
        salary: number;
        id: string;
        employeeId: string;
        firstName: string;
        lastName: string;
        gender: import("../entities/employee.entity").Gender;
        dob?: string | null;
        phone?: string | null;
        startDate?: string | null;
        address?: string | null;
        qualification?: string | null;
        grade?: string | null;
        departmentId?: string | null;
    }[]>;
    createEmployee(body: any): Promise<any>;
    updateEmployee(id: string, body: any): Promise<any>;
    deleteEmployee(id: string): Promise<any>;
}
