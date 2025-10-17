import { provideHttpClient, withFetch } from '@angular/common/http';
import { ApplicationConfig, inject, provideAppInitializer } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withEnabledBlockingInitialNavigation, withInMemoryScrolling } from '@angular/router';
import Aura from '@primeuix/themes/aura';
import { providePrimeNG } from 'primeng/config';
import { appRoutes } from './app.routes';
import { AuthService } from '@/core/services/auth.service';

export const appConfig: ApplicationConfig = {
    providers: [
        provideAppInitializer(() => {
            const authService = inject(AuthService);
            return authService.loadCurrentUser(); 
        }),
        provideRouter(appRoutes, withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }), withEnabledBlockingInitialNavigation()),
        provideHttpClient(withFetch()),
        provideAnimationsAsync(),
        providePrimeNG({ 
            theme: { 
                preset: Aura, 
                options: { darkModeSelector: '.app-dark' } 
            },
            translation: {
                strong: "Forte",
                weak: "Fraca",
                medium: "Média",
                passwordPrompt: "Insira sua senha"
            }
        },)
    ]
};
