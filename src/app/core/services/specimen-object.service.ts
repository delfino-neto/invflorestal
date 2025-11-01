import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { SpecimenObject, SpecimenObjectRequest } from '../models/specimen/specimen-object';
import { Observable } from 'rxjs';
import { Page } from './index';

@Injectable({
  providedIn: 'root'
})
export class SpecimenObjectService {
  private apiUrl = '/api/specimen-objects';

  constructor(private http: HttpClient) { }

  create(request: SpecimenObjectRequest): Observable<SpecimenObject> {
    return this.http.post<SpecimenObject>(this.apiUrl, request);
  }

  search(page: number, size: number): Observable<Page<SpecimenObject>> {
    return this.http.get<Page<SpecimenObject>>(`${this.apiUrl}?page=${page}&size=${size}`);
  }

  findById(id: number): Observable<SpecimenObject> {
    return this.http.get<SpecimenObject>(`${this.apiUrl}/${id}`);
  }

  update(id: number, request: SpecimenObjectRequest): Observable<SpecimenObject> {
    return this.http.put<SpecimenObject>(`${this.apiUrl}/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
