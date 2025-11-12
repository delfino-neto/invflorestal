import { HttpClient, HttpParams } from '@angular/common/http';
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

  getSpeciesTaxonomies(
    page: number, 
    size: number, 
    searchTerm?: string, 
    family?: string, 
    genus?: string
  ): Observable<Page<SpeciesTaxonomy>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    if (searchTerm && searchTerm.trim()) {
      params = params.set('searchTerm', searchTerm.trim());
    }
    if (family) {
      params = params.set('family', family);
    }
    if (genus) {
      params = params.set('genus', genus);
    }
    
    return this.http.get<Page<SpeciesTaxonomy>>(this.apiUrl, {
      params,
      withCredentials: true
    });
  }
  
  getDistinctFamilies(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/families`);
  }
  
  getDistinctGenera(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/genera`);
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
