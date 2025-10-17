import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import {TableModule} from 'primeng/table'
import {ButtonModule} from 'primeng/button'
import {TooltipModule} from 'primeng/tooltip'
import { SharedModule } from "@/shared/shared.module";
import { GlobeComponent } from "@/shared/components/globe/globe.component";
import { BehaviorSubject, Subject, takeUntil } from "rxjs";
import { User } from "@/core/models/user/user";
import { UserService } from "@/core/services/user.service";

@Component({
    templateUrl: './user-management.component.html',
    standalone: true,
    imports: [CommonModule, ButtonModule, SharedModule, TableModule, TooltipModule]
})
export class UserManagementComponent {

    users: User[] = [];
    users$ = new BehaviorSubject<User[]>([]);

    destroy$ = new Subject<void>();

    constructor(private userService: UserService){
        this.loadUsers();
    }

    loadUsers(){
        this.users$.subscribe(value => this.users = value)
        this.userService.search().pipe(takeUntil(this.destroy$)).subscribe((result) => {
            this.users$.next(result.content);
        });
    }

    ngOnDestroy(){
        this.destroy$.next();
        this.destroy$.complete();
    }
}