import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SpeciesInfo, SpeciesInfoRequest } from '../models/specimen/species-info';
import { Page } from './index';

@Injectable({
  providedIn: 'root'
})
export class SpeciesInfoService {
  private apiUrl = '/api/species-info';

  constructor(private http: HttpClient) { }

  create(request: SpeciesInfoRequest): Observable<SpeciesInfo> {
    return this.http.post<SpeciesInfo>(this.apiUrl, request);
  }

  search(page: number, size: number): Observable<Page<SpeciesInfo>> {
    return this.http.get<Page<SpeciesInfo>>(`${this.apiUrl}?page=${page}&size=${size}`);
  }

  findByObjectId(objectId: number, page: number, size: number): Observable<Page<SpeciesInfo>> {
    return this.http.get<Page<SpeciesInfo>>(`${this.apiUrl}/object/${objectId}?page=${page}&size=${size}`);
  }

  findById(id: number): Observable<SpeciesInfo> {
    return this.http.get<SpeciesInfo>(`${this.apiUrl}/${id}`);
  }

  update(id: number, request: SpeciesInfoRequest): Observable<SpeciesInfo> {
    return this.http.put<SpeciesInfo>(`${this.apiUrl}/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
