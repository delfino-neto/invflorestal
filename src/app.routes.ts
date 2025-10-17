import { RedirectFunction, Routes } from '@angular/router';
import { AppLayout } from './app/layout/component/app.layout';
import { authGuard, notAuthenticated } from '@/core/guards/auth';
import { ExampleComponent } from '@/pages/example.component';

export const appRoutes: Routes = [
    {
        path: '',
        component: AppLayout,
        canActivate: [authGuard],
        children: [
            {path: '', redirectTo: 'dashboard', pathMatch: 'full'},
            {
                path: 'dashboard',
                loadChildren: () => import('./app/pages/dashboard/dashboard.routes')
            },
            {
                path: 'users',
                loadChildren: () => import('./app/pages/user-management/user-management.routes')
            }
        ]
    },
    {path: 'ex', component: ExampleComponent},
    { 
        path: 'auth',
        canActivate: [notAuthenticated], 
        loadChildren: () => import('./app/pages/auth/auth.routes') 
    },
    { path: '**', redirectTo: '' },
];
