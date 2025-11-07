export type Gender = 'Male' | 'Female';
export declare class EmployeeEntity {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    gender: Gender;
    dob?: string | null;
    phone?: string | null;
    startDate?: string | null;
    address?: string | null;
    qualification?: string | null;
    salary: number;
    grade?: string | null;
    departmentId?: string | null;
}
