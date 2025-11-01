import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { User } from "../models/user/user";
import { Page } from './index';

@Injectable({
    providedIn: 'root'
})
export class UserService {

    uri: string = "api/users";

    constructor(private http: HttpClient){}

    search(page: number = 0, size: number = 10){
        return this.http.get<Page<User>>(`${this.uri}/search?page=${page}&size=${size}`);
    }
}