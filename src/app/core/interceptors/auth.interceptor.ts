import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.includes('/api/')) {
    if (req.body instanceof FormData) {
      const authReq = req.clone({
        withCredentials: true
      });
      return next(authReq);
    }

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
