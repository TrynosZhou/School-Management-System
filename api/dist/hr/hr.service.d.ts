import { Repository } from 'typeorm';
import { Settings } from '../settings/settings.entity';
import { EmployeeEntity } from '../entities/employee.entity';
type Gender = 'Male' | 'Female';
export interface Department {
    id: string;
    name: string;
}
export interface Employee {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    gender: Gender;
    dob?: string;
    phone?: string;
    startDate?: string;
    address?: string;
    qualification?: string;
    salary: number;
    grade?: string;
    departmentId?: string;
}
export declare class HrService {
    private readonly settingsRepo;
    private readonly empRepo;
    constructor(settingsRepo: Repository<Settings>, empRepo: Repository<EmployeeEntity>);
    private departments;
    private employees;
    listDepartments(): Department[];
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
    createDepartment(name: string): any;
    private genEmployeeCode;
    createEmployee(payload: Omit<Employee, 'id' | 'employeeId'>): Promise<any>;
    updateEmployee(id: string, body: any): Promise<any>;
    deleteEmployee(id: string): Promise<any>;
    processPayroll(rows: Array<{
        employeeId?: string;
        staffName?: string;
        basic: number;
        allowances: number;
        deductions: number;
        taxPayable?: number;
        loanPayable?: number;
        otherDeductions?: number;
        month?: string;
        date?: string;
    }>): Promise<{
        ok: boolean;
        rows: any[];
        payslips: any[];
    }>;
    private generatePayslip;
    private computeLeaveDays;
    private fetchImageBuffer;
    private randId;
}
export {};
