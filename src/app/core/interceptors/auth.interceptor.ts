import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Clone the request and add withCredentials for authentication endpoints
  if (req.url.includes('/api/')) {
    const authReq = req.clone({
      setHeaders: {
        'Content-Type': req.headers.get('Content-Type') || 'application/json'
      },
      withCredentials: true
    });
    return next(authReq);
  }

  return next(req);
};
