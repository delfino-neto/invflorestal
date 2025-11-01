export const API_CONFIG = {
    baseUrl: '/api',
    endpoints: {
        auth: {
            base: '/api/auth',
            login: '/api/auth/authenticate',
            logout: '/api/auth/logout',
            register: '/api/auth/register',
            me: '/api/auth/me'
        },
        users: {
            base: '/api/users',
            search: '/api/users/search'
        },
        speciesTaxonomy: {
            base: '/api/species-taxonomy'
        },
        collectionAreas: {
            base: '/api/collection-areas'
        },
        plots: {
            base: '/api/plots'
        },
        specimenObjects: {
            base: '/api/specimen-objects'
        },
        media: {
            base: '/api/media',
            upload: '/api/media/upload',
            byObject: '/api/media/object'
        }
    }
} as const;
