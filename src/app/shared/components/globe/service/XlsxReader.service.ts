import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';


export interface Coordinate {
  lat: number;
  lon: number;
}

@Injectable({
  providedIn: 'root' 
})
export class XlsxReaderService {

  constructor() { }

  
  public getCoordinatesFromFile(file: File): Promise<Coordinate[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e: any) => {
        try {
          
          const data = e.target.result;
          const workbook = XLSX.read(data, { type: 'binary' });

          
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          
          const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          
          const coordinates = rows
            .slice(1) 
            .map(row => {
              const lon = row[3]; 
              const lat = row[4]; 

              
              const parsedLon = parseFloat(lon);
              const parsedLat = parseFloat(lat);

              if (lon != null && lat != null && !isNaN(parsedLon) && !isNaN(parsedLat)) {
                return { lat: parsedLat, lon: parsedLon };
              }
              return null; 
            })
            .filter((coord): coord is Coordinate => coord !== null); 

          resolve(coordinates);

        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = (error) => {
        reject(error);
      };

      reader.readAsBinaryString(file);
    });
  }
}