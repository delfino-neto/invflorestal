import { Routes } from '@angular/router';

export const SPECIES_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () => import('./species-taxonomy/species-taxonomy-list.component').then(m => m.SpeciesTaxonomyListComponent),
        data: { breadcrumb: 'Espécies' }
    }
];
