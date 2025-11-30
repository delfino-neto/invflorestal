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
                    label: 'Inventário',
                    icon: 'pi pi-fw pi-sitemap',
                    items: [
                        { 
                            label: 'Áreas de Coleta', 
                            icon: 'pi pi-fw pi-map-marker', 
                            routerLink: ['/collection-areas'],
                            routerLinkActiveOptions: {
                                exact: false,
                            }
                        },
                        { label: 'Parcelas', icon: 'pi pi-fw pi-th-large', routerLink: ['/plots'], disabled: true },
                        { 
                            label: 'Espécimes', 
                            icon: 'pi pi-fw pi-sitemap', 
                            routerLink: ['/specimens'],
                            routerLinkActiveOptions: {
                                exact: false,
                            }
                        }
                    ]
                },
                { 
                    label: 'Espécies',
                    iconClass: 'nature',
                    items: [
                        { label: 'Listar Espécies', icon: 'pi pi-fw pi-th-large', routerLink: ['/species'] },
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
                { label: 'Logs de Auditoria', icon: 'pi pi-fw pi-history', routerLink: ['/audit-logs'] },
            ]);
        }
    }
}
