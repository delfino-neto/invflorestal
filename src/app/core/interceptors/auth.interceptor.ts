import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Authentication Interceptor
 * 
 * Adiciona credenciais e headers de autenticação nas requisições.
 * 
 * IMPORTANTE: Para uploads de arquivos (FormData), não definimos Content-Type
 * manualmente, pois o navegador precisa adicionar automaticamente o boundary
 * necessário para multipart/form-data.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Clone the request and add withCredentials for authentication endpoints
  if (req.url.includes('/api/')) {
    // Don't set Content-Type for FormData requests (file uploads)
    // The browser will automatically set it with the correct boundary
    if (req.body instanceof FormData) {
      const authReq = req.clone({
        withCredentials: true
      });
      return next(authReq);
    }

    // For other requests, set Content-Type to application/json
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
