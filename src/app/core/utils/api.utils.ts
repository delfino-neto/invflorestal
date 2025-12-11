import { HttpParams } from '@angular/common/http';

export class ApiUtils {
  
  static createPaginationParams(page: number = 0, size: number = 10): HttpParams {
    return new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
  }

  
  static createParams(params: Record<string, any>): HttpParams {
    let httpParams = new HttpParams();
    
    Object.keys(params).forEach(key => {
      const value = params[key];
      if (value !== null && value !== undefined) {
        httpParams = httpParams.set(key, value.toString());
      }
    });
    
    return httpParams;
  }

  
  static buildUrl(baseUrl: string, ...pathSegments: (string | number)[]): string {
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const path = pathSegments.join('/');
    return `${cleanBase}/${path}`;
  }
}
