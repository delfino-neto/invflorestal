import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { User, Role, UserRequest, UserUpdateRequest } from "../models/user/user";
import { Page } from './index';

@Injectable({
    providedIn: 'root'
})
export class UserService {

    uri: string = "api/users";
    rolesUri: string = "api/roles";

    constructor(private http: HttpClient){}

    search(page: number = 0, size: number = 10, searchTerm?: string): Observable<Page<User>> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());
        
        if (searchTerm) {
            params = params.set('searchTerm', searchTerm);
        }
        
        return this.http.get<Page<User>>(`${this.uri}/search`, { params });
    }

    findById(id: number): Observable<User> {
        return this.http.get<User>(`${this.uri}/${id}`);
    }

    create(request: UserRequest): Observable<User> {
        return this.http.post<User>(this.uri, request);
    }

    update(id: number, request: UserUpdateRequest): Observable<User> {
        return this.http.put<User>(`${this.uri}/${id}`, request);
    }

    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.uri}/${id}`);
    }

    toggleStatus(id: number): Observable<User> {
        return this.http.patch<User>(`${this.uri}/${id}/toggle-status`, {});
    }

    toggleLock(id: number): Observable<User> {
        return this.http.patch<User>(`${this.uri}/${id}/toggle-lock`, {});
    }

    getRoles(): Observable<Role[]> {
        return this.http.get<Role[]>(this.rolesUri);
    }
}