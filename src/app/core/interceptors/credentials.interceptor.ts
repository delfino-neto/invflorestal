import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpHandlerFn
} from '@angular/common/http';
import { Observable } from 'rxjs';

export const credentialsInterceptor = (
    request: HttpRequest<unknown>, 
    next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
    console.log('Credentials Interceptor invoked');
    request = request.clone({
      withCredentials: true
    });
    return next(request);
};
