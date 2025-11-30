export interface AuditLog {
    id: number;
    action: AuditAction;
    entityName: string;
    entityId: string;
    userId?: string;
    userName?: string;
    userEmail?: string;
    description?: string;
    oldValue?: string;
    newValue?: string;
    ipAddress?: string;
    userAgent?: string;
    timestamp: Date;
}

export enum AuditAction {
    CREATE = 'CREATE',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE',
    LOGIN = 'LOGIN',
    LOGOUT = 'LOGOUT',
    STATUS_CHANGE = 'STATUS_CHANGE',
    LOCK_CHANGE = 'LOCK_CHANGE',
    PASSWORD_CHANGE = 'PASSWORD_CHANGE'
}

export interface AuditLogPage {
    content: AuditLog[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
}
