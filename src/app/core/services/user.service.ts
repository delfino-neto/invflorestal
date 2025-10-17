import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { User } from "../models/user/user";

export interface Page<T> {
    content: T[];
    size: number;
    totalElements: number;
}

@Injectable({
    providedIn: 'root'
})
export class UserService {

    uri: string = "api/users";

    constructor(private http: HttpClient){}

    search(){
        return this.http.get<Page<User>>(`${this.uri}/search`);
    }
}