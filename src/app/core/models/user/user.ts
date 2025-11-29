export interface User {
    id?: number;
    firstName: string;
    lastName: string;
    name: string;
    email: string;
    dateOfBirth?: Date;
    enabled: boolean;
    accountLocked: boolean;
    roles: string[];
    createdAt?: Date;
    updatedAt?: Date;
}

export interface Role {
    id: number;
    name: string;
}

export interface UserRequest {
    firstName: string;
    lastName: string;
    email: string;
    dateOfBirth?: Date;
    password: string;
    enabled?: boolean;
    accountLocked?: boolean;
    roleIds?: number[];
}

export interface UserUpdateRequest {
    firstName?: string;
    lastName?: string;
    email?: string;
    dateOfBirth?: Date;
    password?: string;
    enabled?: boolean;
    accountLocked?: boolean;
    roleIds?: number[];
}