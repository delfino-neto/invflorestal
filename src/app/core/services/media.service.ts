import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Media, MediaRequest } from '../models/media/media';
import { Observable } from 'rxjs';
import { Page } from './index';

@Injectable({
  providedIn: 'root'
})
export class MediaService {
  private apiUrl = '/api/media';

  constructor(private http: HttpClient) { }

  create(request: MediaRequest): Observable<Media> {
    return this.http.post<Media>(this.apiUrl, request);
  }

  uploadImage(objectId: number, file: File, description?: string, uploadedById?: number): Observable<Media> {
    const formData = new FormData();
    formData.append('file', file);
    if (description) {
      formData.append('description', description);
    }
    if (uploadedById) {
      formData.append('uploadedById', uploadedById.toString());
    }
    
    return this.http.post<Media>(`${this.apiUrl}/upload/${objectId}`, formData);
  }

  search(page: number, size: number): Observable<Page<Media>> {
    return this.http.get<Page<Media>>(`${this.apiUrl}?page=${page}&size=${size}`);
  }

  findByObjectId(objectId: number, page: number, size: number): Observable<Page<Media>> {
    return this.http.get<Page<Media>>(`${this.apiUrl}/object/${objectId}?page=${page}&size=${size}`);
  }

  findById(id: number): Observable<Media> {
    return this.http.get<Media>(`${this.apiUrl}/${id}`);
  }

  update(id: number, request: MediaRequest): Observable<Media> {
    return this.http.put<Media>(`${this.apiUrl}/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
