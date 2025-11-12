import { Routes } from '@angular/router';

export const COLLECTION_AREA_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('./collection-area-list/collection-area-list.component').then(m => m.CollectionAreaListComponent)
    },
    {
        path: 'new',
        loadComponent: () =>
            import('./collection-area-form/collection-area-form.component').then(m => m.CollectionAreaFormComponent)
    },
    {
        path: 'view/:id',
        loadComponent: () =>
            import('./collection-area-detail/collection-area-detail.component').then(m => m.CollectionAreaDetailComponent)
    },
    {
        path: 'edit/:id',
        loadComponent: () =>
            import('./collection-area-form/collection-area-form.component').then(m => m.CollectionAreaFormComponent)
    }
];
