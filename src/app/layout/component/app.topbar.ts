import { Component } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StyleClassModule } from 'primeng/styleclass';
import { AppConfigurator } from './app.configurator';
import { LayoutService } from '../service/layout.service';
import { AvatarModule } from 'primeng/avatar';
import { PopoverModule } from 'primeng/popover';
import { MenuModule } from 'primeng/menu';
import { AuthService } from '@/core/services/auth.service';

@Component({
    selector: 'app-topbar',
    standalone: true,
    imports: [RouterModule, CommonModule, StyleClassModule, AppConfigurator, AvatarModule, MenuModule],
    templateUrl: './app.topbar.html',
    styleUrls: ['./app.topbar.scss']
})
export class AppTopbar {
    items: MenuItem[] = [
        {
            label: "Sair",
            icon: 'pi pi-sign-out',
            styleClass: 'text-red',
            command: () => {
                this.authService.logout().subscribe(() => {
                    this.router.navigate(['/auth/login']);
                })
            }
        }
    ];

    constructor(
        public layoutService: LayoutService,
        private authService: AuthService,
        private router: Router,
    ) {}

    get name(){
        return this.authService.getName() ?? "Usuário";
    }

    get username(){
        return this.authService.getUsername() ?? "-";
    }

    get role(){
        const roles =  this.authService.getRoles();
        if(roles){
            roles.sort((a, b) => a.localeCompare(b));
            return roles[0];
        }
        return "User";
    }

    toggleDarkMode() {
        this.layoutService.layoutConfig.update((state) => ({ ...state, darkTheme: !state.darkTheme }));
    }
}
