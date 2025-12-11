import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';

// Definimos uma interface para ter tipagem forte em nosso retorno.
export interface Coordinate {
  lat: number;
  lon: number;
}

@Injectable({
  providedIn: 'root' // Torna o serviço disponível em toda a aplicação.
})
export class XlsxReaderService {

  constructor() { }

  /**
   * Processa um arquivo XLSX para extrair um vetor de coordenadas.
   * Assume que a coluna 4 é Longitude e a coluna 5 é Latitude.
   * @param file O objeto de arquivo vindo de um <input type="file">.
   * @returns Uma promessa que resolve para um array de objetos de coordenadas.
   */
  public getCoordinatesFromFile(file: File): Promise<Coordinate[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e: any) => {
        try {
          // 1. Lê os dados binários do arquivo.
          const data = e.target.result;
          const workbook = XLSX.read(data, { type: 'binary' });

          // 2. Pega a primeira planilha do arquivo.
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          // 3. Converte a planilha em um array de arrays.
          const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          // 4. Mapeia as linhas para extrair, validar e formatar as coordenadas.
          const coordinates = rows
            .slice(1) // Pula a primeira linha (cabeçalho). Remova se não houver cabeçalho.
            .map(row => {
              const lon = row[3]; // Coluna 4 (índice 3)
              const lat = row[4]; // Coluna 5 (índice 4)

              // Validação robusta para garantir que os dados são números válidos.
              const parsedLon = parseFloat(lon);
              const parsedLat = parseFloat(lat);

              if (lon != null && lat != null && !isNaN(parsedLon) && !isNaN(parsedLat)) {
                return { lat: parsedLat, lon: parsedLon };
              }
              return null; // Linha inválida ou vazia
            })
            .filter((coord): coord is Coordinate => coord !== null); // Filtra as linhas inválidas.

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