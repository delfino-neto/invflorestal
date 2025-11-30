import { Routes } from '@angular/router';
import { AppLayout } from './app/layout/component/app.layout';
import { AUTH_ROUTES } from './app/pages/auth/auth.routes';
// import { DASHBOARD_ROUTES } from './app/pages/dashboard/dashboard.routes';
import { DASHBOARD_ROUTES } from './app/pages/dashboard/dashboard.routes';
import { USER_MANAGEMENT_ROUTES } from './app/pages/user-management/user-management.routes';
import { SPECIES_ROUTES } from './app/pages/species/species.routes';
import { COLLECTION_AREA_ROUTES } from './app/pages/collection-areas/collection-area.routes';
import { SPECIMEN_ROUTES } from './app/pages/specimens/specimen.routes';
import { AUDIT_LOG_ROUTES } from './app/pages/audit-logs/audit-logs.routes';
import { DATA_IMPORT_ROUTES } from './app/pages/data-import/data-import.routes';
import { authGuard } from '@/core';

export const routes: Routes = [
    { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    { path: 'auth', children: AUTH_ROUTES },
    { 
        path: '', 
        canActivate: [authGuard],
        component: AppLayout, 
        children: [
            { path: 'dashboard', children: DASHBOARD_ROUTES },
            { path: 'users', children: USER_MANAGEMENT_ROUTES },
            { path: 'species', children: SPECIES_ROUTES },
            { path: 'collection-areas', children: COLLECTION_AREA_ROUTES },
            { path: 'specimens', children: SPECIMEN_ROUTES },
            { path: 'audit-logs', children: AUDIT_LOG_ROUTES },
            { path: 'imports', children: DATA_IMPORT_ROUTES }
        ]
    },
    { path: '**', redirectTo: 'error' } // Wildcard route for a 404 page
];
