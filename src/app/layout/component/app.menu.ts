import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';
import { AuthService } from '@/core/services/auth.service';

@Component({
    selector: 'app-menu',
    standalone: true,
    imports: [CommonModule, AppMenuitem, RouterModule],
    template: `<ul class="layout-menu">
        <ng-container *ngFor="let item of model; let i = index">
            <li app-menuitem *ngIf="!item.separator" [item]="item" [index]="i" [root]="true"></li>
            <li *ngIf="item.separator" class="menu-separator"></li>
        </ng-container>
    </ul> `
})
export class AppMenu {
    model: MenuItem[] = [];

    constructor(
        private authService: AuthService,
        private router: Router
    ){}

    ngOnInit() {
        this.model = [{}];

        this.model[0].items = [
            { label: 'Início', icon: 'pi pi-fw pi-home', routerLink: ['/dashboard'] },
            { label: 'Mapa Georreferenciado', icon: 'pi pi-fw pi-map', routerLink: ['/map'], disabled: true },
        ];

        if(this.authService.getRoles()?.includes("ADMIN")){
            this.model[0].items.push(...[
                { 
                    label: 'Espécies',
                    iconClass: 'nature',
                    disabled: true,
                    items: [
                    { label: 'Listar', icon: 'pi pi-fw pi-list', routerLink: ['/species'] },
                    { label: 'Cadastrar', icon: 'pi pi-fw pi-plus', routerLink: ['/species/new'] },
                    { label: 'Histórico', icon: 'pi pi-fw pi-history', routerLink: ['/species/history'] },
                    { label: 'Identificação IA', icon: 'pi pi-fw pi-camera', routerLink: ['/species/identify'] }
                    ]
                },
                { 
                    label: 'Dados', 
                    icon: 'pi pi-fw pi-database', 
                    disabled: true,
                    items: [
                    { label: 'Importar', icon: 'pi pi-fw pi-upload', routerLink: ['/imports'] },
                    { label: 'Exportar', icon: 'pi pi-fw pi-download', routerLink: ['/exports'] }
                    ]
                },
                { label: 'Gestão de Usuários', icon: 'pi pi-fw pi-users', routerLink: ['/users'] },
            ]);
        }
    }
}
