import { ApplicationConfig, inject, provideAppInitializer } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withEnabledBlockingInitialNavigation, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import Aura from '@primeuix/themes/aura';
import { providePrimeNG } from 'primeng/config';
import { routes } from './app.routes';
import { AuthService } from '@/core/services/auth.service';
import { authInterceptor } from '@/core/interceptors/auth.interceptor';
import { credentialsInterceptor } from '@/core/interceptors/credentials.interceptor';

export const appConfig: ApplicationConfig = {
    providers: [
        provideAppInitializer(() => {
            const authService = inject(AuthService);
            return authService.loadCurrentUser(); 
        }),
        provideRouter(routes, withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }), withEnabledBlockingInitialNavigation()),
        provideHttpClient(withFetch(), withInterceptors([authInterceptor, credentialsInterceptor])),
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
