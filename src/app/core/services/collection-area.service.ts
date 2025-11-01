import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { CollectionArea, CollectionAreaRequest } from '../models/collection/collection-area';
import { Observable } from 'rxjs';
import { Page } from './index';
import { ApiUtils } from '../utils/api.utils';
import { API_CONFIG } from '../config/api.config';

@Injectable({
  providedIn: 'root'
})
export class CollectionAreaService {
  private apiUrl = API_CONFIG.endpoints.collectionAreas.base;

  constructor(private http: HttpClient) { }

  create(request: CollectionAreaRequest): Observable<CollectionArea> {
    return this.http.post<CollectionArea>(this.apiUrl, request);
  }

  search(page: number = 0, size: number = 10): Observable<Page<CollectionArea>> {
    const params = ApiUtils.createPaginationParams(page, size);
    return this.http.get<Page<CollectionArea>>(this.apiUrl, { params });
  }

  findById(id: number): Observable<CollectionArea> {
    return this.http.get<CollectionArea>(ApiUtils.buildUrl(this.apiUrl, id));
  }

  update(id: number, request: CollectionAreaRequest): Observable<CollectionArea> {
    return this.http.put<CollectionArea>(ApiUtils.buildUrl(this.apiUrl, id), request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(ApiUtils.buildUrl(this.apiUrl, id));
  }
}
