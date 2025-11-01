import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { SpeciesTaxonomy } from '../models/species/species-taxonomy';
import { SpeciesTaxonomyRequest } from '../models/species/species-taxonomy-request';
import { Observable } from 'rxjs';
import { Page } from './index';

@Injectable({
  providedIn: 'root'
})
export class SpeciesTaxonomyService {
  private apiUrl = '/api/species-taxonomy';

  constructor(private http: HttpClient) { }

  createSpeciesTaxonomy(speciesTaxonomy: SpeciesTaxonomyRequest): Observable<SpeciesTaxonomy> {
    return this.http.post<SpeciesTaxonomy>(this.apiUrl, speciesTaxonomy);
  }

  getSpeciesTaxonomies(page: number, size: number): Observable<Page<SpeciesTaxonomy>> {
    return this.http.get<Page<SpeciesTaxonomy>>(`${this.apiUrl}?page=${page}&size=${size}`);
  }

  getSpeciesTaxonomyById(id: number): Observable<SpeciesTaxonomy> {
    return this.http.get<SpeciesTaxonomy>(`${this.apiUrl}/${id}`);
  }

  updateSpeciesTaxonomy(id: number, speciesTaxonomy: SpeciesTaxonomyRequest): Observable<SpeciesTaxonomy> {
    return this.http.put<SpeciesTaxonomy>(`${this.apiUrl}/${id}`, speciesTaxonomy);
  }

  deleteSpeciesTaxonomy(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
