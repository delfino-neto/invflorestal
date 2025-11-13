import { Routes } from '@angular/router';

export const SPECIMEN_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () => import('./specimen-list.component').then(m => m.SpecimenListComponent),
        data: { breadcrumb: 'Listagem de Espécimes' }
    },
    {
        path: 'new',
        loadComponent: () => import('./specimen-form.component').then(m => m.SpecimenFormComponent),
        data: { breadcrumb: 'Novo Espécime' }
    },
    {
        path: 'edit/:id',
        loadComponent: () => import('./specimen-form.component').then(m => m.SpecimenFormComponent),
        data: { breadcrumb: 'Editar Espécime' }
    },
    {
        path: 'view/:id',
        loadComponent: () => import('./specimen-detail.component').then(m => m.SpecimenDetailComponent),
        data: { breadcrumb: 'Detalhes do Espécime' }
    }
];
