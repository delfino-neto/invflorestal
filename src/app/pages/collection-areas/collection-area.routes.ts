import { Routes } from '@angular/router';

export const COLLECTION_AREA_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('./collection-area-list/collection-area-list.component').then(m => m.CollectionAreaListComponent)
    }
];
