import { Repository } from 'typeorm';
import { Settings } from './settings.entity';
import { User } from '../entities/user.entity';
export declare class SettingsController {
    private readonly repo;
    private readonly users;
    constructor(repo: Repository<Settings>, users: Repository<User>);
    get(): Promise<Settings>;
    update(body: Partial<Settings>): Promise<Settings>;
    uploadLogo(file?: any): Promise<{
        success: boolean;
        message: string;
        logoUrl?: undefined;
    } | {
        success: boolean;
        logoUrl: string;
        message?: undefined;
    }>;
    private allModules;
    listModules(): {
        key: string;
        label: string;
    }[];
    getUserModules(email?: string): Promise<{
        email: string;
        modules: string[];
    }>;
    setUserModules(body: {
        email?: string;
        modules?: string[];
    }): Promise<{
        success: boolean;
    }>;
}
