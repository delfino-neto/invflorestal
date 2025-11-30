import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '@/core/config/api.config';
import { AuditLog, AuditLogPage, AuditAction } from '@/core/models/audit/audit-log';

@Injectable({
    providedIn: 'root'
})
export class AuditLogService {
    private apiUrl = `${API_CONFIG.baseUrl}/audit-logs`;

    constructor(private http: HttpClient) {}

    getAuditLogs(page: number = 0, size: number = 20): Observable<AuditLogPage> {
        const params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());
        
        return this.http.get<AuditLogPage>(this.apiUrl, { params });
    }

    getAuditLogsByEntity(entityName: string, entityId: string, page: number = 0, size: number = 20): Observable<AuditLogPage> {
        const params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());
        
        return this.http.get<AuditLogPage>(`${this.apiUrl}/entity/${entityName}/${entityId}`, { params });
    }

    getAuditLogsByUser(userId: string, page: number = 0, size: number = 20): Observable<AuditLogPage> {
        const params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());
        
        return this.http.get<AuditLogPage>(`${this.apiUrl}/user/${userId}`, { params });
    }

    getAuditLogsByAction(action: AuditAction, page: number = 0, size: number = 20): Observable<AuditLogPage> {
        const params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());
        
        return this.http.get<AuditLogPage>(`${this.apiUrl}/action/${action}`, { params });
    }

    getAuditLogsByDateRange(startDate: Date, endDate: Date, page: number = 0, size: number = 20): Observable<AuditLogPage> {
        const params = new HttpParams()
            .set('startDate', startDate.toISOString())
            .set('endDate', endDate.toISOString())
            .set('page', page.toString())
            .set('size', size.toString());
        
        return this.http.get<AuditLogPage>(`${this.apiUrl}/date-range`, { params });
    }

    deleteAuditLog(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }

    deleteAuditLogs(ids: number[]): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/batch`, { body: ids });
    }
}
