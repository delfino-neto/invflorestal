import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';

export interface ImportMapping {
  columnMapping: { [key: number]: string };
  plotId: number;
  sheetName?: string;
  startRow: number;
  autoCreateSpecies: boolean;
}

export interface ImportError {
  rowNumber: number;
  message: string;
  rowData: string;
}

export interface ImportResult {
  totalRows: number;
  successCount: number;
  errorCount: number;
  speciesCreated: number;
  errors: ImportError[];
  executionTimeMs?: number;
}

@Injectable({
  providedIn: 'root'
})
export class DataImportService {
  private readonly apiUrl = `${API_CONFIG.baseUrl}/import`;

  constructor(private http: HttpClient) {}

  importSpecimens(file: File, mapping: ImportMapping): Observable<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mapping', JSON.stringify(mapping));

    return this.http.post<ImportResult>(`${this.apiUrl}/specimens`, formData, {
        withCredentials: true
    });
  }
}
