import { Routes } from '@angular/router';

export const SPECIES_ROUTES: Routes = [
    {
        path: 'taxonomy',
        loadComponent: () => import('./species-taxonomy/species-taxonomy-list.component').then(m => m.SpeciesTaxonomyListComponent),
        data: { breadcrumb: 'Listagem de Espécies' }
    },
    {
        path: 'taxonomy/new',
        loadComponent: () => import('./species-taxonomy/species-taxonomy-form.component').then(m => m.SpeciesTaxonomyFormComponent),
        data: { breadcrumb: 'Nova Taxonomia' }
    },
    {
        path: 'taxonomy/edit/:id',
        loadComponent: () => import('./species-taxonomy/species-taxonomy-form.component').then(m => m.SpeciesTaxonomyFormComponent),
        data: { breadcrumb: 'Editar Taxonomia' }
    }
];
