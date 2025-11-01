import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Plot, PlotRequest } from '../models/collection/plot';
import { Observable } from 'rxjs';
import { Page } from './index';

@Injectable({
  providedIn: 'root'
})
export class PlotService {
  private apiUrl = '/api/plots';

  constructor(private http: HttpClient) { }

  create(request: PlotRequest): Observable<Plot> {
    return this.http.post<Plot>(this.apiUrl, request);
  }

  search(page: number, size: number): Observable<Page<Plot>> {
    return this.http.get<Page<Plot>>(`${this.apiUrl}?page=${page}&size=${size}`);
  }

  findById(id: number): Observable<Plot> {
    return this.http.get<Plot>(`${this.apiUrl}/${id}`);
  }

  update(id: number, request: PlotRequest): Observable<Plot> {
    return this.http.put<Plot>(`${this.apiUrl}/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
