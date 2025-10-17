import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "../services/auth.service";
import { firstValueFrom } from "rxjs";
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, take, tap } from 'rxjs/operators';

export const authGuard: CanActivateFn = async () => {
    const authService = inject(AuthService);
    const router = inject(Router);
 
    const verify = await firstValueFrom(
        toObservable(authService.authCheckCompleted).pipe(
            filter(completed => completed),
            take(1)
        )
    );

    if (verify && authService.isAuthenticated()) {
        return true;
    }

    router.navigate(['/auth/login']);
    return false;
};

export const notAuthenticated: CanActivateFn = async () => {
    const authService = inject(AuthService);
    const router = inject(Router);
 
    const verify = await firstValueFrom(
        toObservable(authService.authCheckCompleted).pipe(
            filter(completed => completed),
            take(1)
        )
    );

    if (verify && authService.isAuthenticated()) {
        router.navigate(['/'])
        return false;
    }

    return true;
};