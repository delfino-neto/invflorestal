import { HttpClient } from "@angular/common/http";
import { computed, effect, Injectable, OnDestroy, signal } from "@angular/core";
import { UserRegisterRequest } from "../models/user/user-register";
import { UserLoginRequest } from "../models/user/user-login";
import { UserLoginResponse } from "../models/user/user-login-response";
import { catchError, firstValueFrom, Observable, of, Subject, takeUntil, tap } from "rxjs";
import { User } from "../models/user/user";

@Injectable({
    providedIn: 'root'
})
export class AuthService {

    uri: string = "/api/auth";

    private currentUser = signal<User | null>(null);
    public authCheckCompleted = signal<boolean>(false);
    public isAuthenticated = computed(() => this.currentUser() !== null);

    constructor(private http: HttpClient){}

    loadCurrentUser(): Promise<User | null> {
        return firstValueFrom(
        this.http.get<User>('/api/auth/me', { withCredentials: true }).pipe(
            tap(user => this.currentUser.set(user)),
            catchError(() => {
                this.currentUser.set(null);
                return of(null);
            }),
            tap(() => this.authCheckCompleted.set(true))
        )
        );
    }

    getName(){
        return this.currentUser()?.fullName;
    }

    getUsername(){
        return this.currentUser()?.email;
    }

    getRoles(){
        return this.currentUser()?.roles;
    }

    async login(payload: UserLoginRequest): Promise<UserLoginResponse> {
        return await firstValueFrom(
            this.http.post<UserLoginResponse>(`${this.uri}/authenticate`, payload, { withCredentials: true })
        );
    }

    logout(): Observable<UserLoginResponse> {
        return this.http.post<UserLoginResponse>(`${this.uri}/logout`, {}, { withCredentials: true }).pipe(
            tap(() => this.currentUser.set(null))
        );
    }

    register(payload: UserRegisterRequest): Observable<void> {
        return this.http.post<void>(`${this.uri}/register`, payload);
    }

    me(): Observable<User | null> {
        return this.http.get<User | null>(`${this.uri}/me`, { withCredentials: true });
    }
}