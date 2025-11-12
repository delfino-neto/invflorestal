import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Plot, PlotRequest } from '../models/collection/plot';
import { Observable } from 'rxjs';
import { Page } from './index';
import { ApiUtils } from '../utils/api.utils';

export interface PlotImportRequest {
  targetAreaId: number;
  importType: 'AREA' | 'PLOT';
  sourceAreaId?: number;
  sourcePlotId?: number;
  plotCode: string;
}

export interface BulkPlotImportRequest {
  targetAreaId: number;
  items: ImportItem[];
}

export interface ImportItem {
  importType: 'AREA' | 'PLOT';
  sourceAreaId?: number;
  sourcePlotId?: number;
  plotCode: string;
}

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
    const params = ApiUtils.createParams({ page, size });
    return this.http.get<Page<Plot>>(this.apiUrl, { params });
  }

  searchByArea(areaId: number, page: number = 0, size: number = 100): Observable<Page<Plot>> {
    const params = ApiUtils.createParams({ page, size, areaId });
    return this.http.get<Page<Plot>>(this.apiUrl, { params });
  }

  findById(id: number): Observable<Plot> {
    return this.http.get<Plot>(ApiUtils.buildUrl(this.apiUrl, id));
  }

  update(id: number, request: PlotRequest): Observable<Plot> {
    return this.http.put<Plot>(ApiUtils.buildUrl(this.apiUrl, id), request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(ApiUtils.buildUrl(this.apiUrl, id));
  }

  importPlot(request: PlotImportRequest): Observable<Plot> {
    return this.http.post<Plot>(`${this.apiUrl}/import`, request);
  }

  importPlots(request: BulkPlotImportRequest): Observable<Plot[]> {
    return this.http.post<Plot[]>(`${this.apiUrl}/import/bulk`, request);
  }
}
