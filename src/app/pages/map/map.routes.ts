import { Routes } from '@angular/router';

export const MAP_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () => import('./map-page.component').then(m => m.MapPageComponent)
    }
];
