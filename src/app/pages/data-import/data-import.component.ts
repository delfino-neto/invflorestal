import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';

// PrimeNG
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { FileUploadModule } from 'primeng/fileupload';
import { ToastModule } from 'primeng/toast';
import { ProgressBarModule } from 'primeng/progressbar';
import { DividerModule } from 'primeng/divider';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { ChipModule } from 'primeng/chip';
import * as XLSX from 'xlsx';

// Services & Models
import { PlotService } from '@/core/services/plot.service';
import { Plot } from '@/core/models/collection/plot';
import { CollectionAreaService } from '@/core/services/collection-area.service';
import { CollectionArea } from '@/core/models/collection/collection-area';
import { DataImportService, ImportMapping, ImportResult } from '@/core/services/data-import.service';

interface ColumnMapping {
  columnIndex: number;
  fieldName: string;
}

@Component({
  selector: 'app-data-import',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    FileUploadModule,
    ToastModule,
    ProgressBarModule,
    DividerModule,
    SelectModule,
    InputNumberModule,
    CheckboxModule,
    TableModule,
    TagModule,
    InputTextModule,
    ChipModule
  ],
  providers: [MessageService],
  templateUrl: './data-import.component.html',
  styleUrl: './data-import.component.scss'
})
export class DataImportComponent implements OnInit {
  importForm: FormGroup;
  selectedFile: File | null = null;
  uploading = false;
  importResult: ImportResult | null = null;
  collectionAreas: CollectionArea[] = [];
  plots: Plot[] = [];
  filteredPlots: Plot[] = [];
  filePreview: any[] = [];
  previewColumns: string[] = [];
  
  availableFields = [
    { label: 'Nome Científico', value: 'scientificName' },
    { label: 'Latitude', value: 'latitude' },
    { label: 'Longitude', value: 'longitude' },
    { label: 'Altura (m)', value: 'heightM' },
    { label: 'DBM (cm)', value: 'dbmCm' },
    { label: 'Idade (anos)', value: 'ageYears' },
    { label: 'Condição', value: 'condition' },
    { label: 'Data de Observação', value: 'observationDate' }
  ];

  columnMappings: ColumnMapping[] = [
    { columnIndex: 0, fieldName: '' },
    { columnIndex: 1, fieldName: '' },
    { columnIndex: 2, fieldName: '' },
    { columnIndex: 3, fieldName: '' },
    { columnIndex: 4, fieldName: '' }
  ];

  constructor(
    private fb: FormBuilder,
    private dataImportService: DataImportService,
    private plotService: PlotService,
    private collectionAreaService: CollectionAreaService,
    private messageService: MessageService
  ) {
    this.importForm = this.fb.group({
      collectionAreaId: [null, Validators.required],
      plotId: [null, Validators.required],
      sheetName: [''],
      startRow: [1, [Validators.required, Validators.min(0)]],
      autoCreateSpecies: [true]
    });
  }

  ngOnInit(): void {
    this.loadCollectionAreas();
    this.loadPlots();
  }

  loadCollectionAreas(): void {
    this.collectionAreaService.search(0, 1000).subscribe({
      next: (response) => {
        this.collectionAreas = response.content;
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Erro ao carregar áreas de coleta'
        });
      }
    });
  }

  loadPlots(): void {
    this.plotService.search(0, 1000).subscribe({
      next: (response) => {
        this.plots = response.content;
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Erro ao carregar plots'
        });
      }
    });
  }

  onFileSelect(event: any): void {
    const file = event.files[0];
    if (file) {
      this.selectedFile = file;
      this.parseFilePreview(file);
      this.messageService.add({
        severity: 'info',
        summary: 'Arquivo Selecionado',
        detail: file.name
      });
    }
  }

  onFileRemove(): void {
    this.selectedFile = null;
    this.filePreview = [];
    this.previewColumns = [];
  }

  parseFilePreview(file: File): void {
    const reader = new FileReader();
    
    reader.onload = (e: any) => {
      try {
        const data = e.target.result;
        
        if (file.name.endsWith('.csv')) {
          this.parseCSVPreview(data);
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          this.parseExcelPreview(data);
        }
      } catch (error) {
        console.error('Error parsing file preview:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Erro ao processar preview do arquivo'
        });
      }
    };

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  }

  parseCSVPreview(data: string): void {
    const lines = data.split('\n').slice(0, 20); // First 20 lines
    const preview: any[] = [];
    
    lines.forEach((line, index) => {
      if (line.trim()) {
        const values = line.split(/\t|,/);
        const row: any = {};
        values.forEach((value, colIndex) => {
          row[`col${colIndex}`] = value.trim();
        });
        preview.push(row);
      }
    });

    if (preview.length > 0) {
      this.filePreview = preview;
      this.previewColumns = Object.keys(preview[0]);
    }
  }

  parseExcelPreview(data: any): void {
    const workbook = XLSX.read(data, { type: 'binary' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
    
    const preview: any[] = [];
    const maxRows = Math.min(20, jsonData.length);
    
    for (let i = 0; i < maxRows; i++) {
      const row: any = {};
      jsonData[i].forEach((value, colIndex) => {
        row[`col${colIndex}`] = value !== undefined ? value.toString() : '';
      });
      preview.push(row);
    }

    if (preview.length > 0) {
      this.filePreview = preview;
      this.previewColumns = Object.keys(preview[0]);
    }
  }

  addColumnMapping(): void {
    const maxIndex = Math.max(...this.columnMappings.map(m => m.columnIndex), -1);
    this.columnMappings.push({ columnIndex: maxIndex + 1, fieldName: '' });
  }

  removeColumnMapping(index: number): void {
    this.columnMappings.splice(index, 1);
  }

  onCollectionAreaChange(): void {
    const collectionAreaId = this.importForm.get('collectionAreaId')?.value;
    this.importForm.patchValue({ plotId: null });
    
    if (collectionAreaId) {
      this.filteredPlots = this.plots.filter(plot => plot.areaId === collectionAreaId);
    } else {
      this.filteredPlots = [];
    }
  }

  canImport(): boolean {
    return this.selectedFile !== null && 
           this.importForm.valid && 
           this.columnMappings.some(m => m.fieldName !== '');
  }

  importData(): void {
    if (!this.canImport() || !this.selectedFile) {
      return;
    }

    this.uploading = true;
    this.importResult = null;

    // Prepare column mapping
    const columnMapping: { [key: number]: string } = {};
    this.columnMappings
      .filter(m => m.fieldName !== '')
      .forEach(m => {
        columnMapping[m.columnIndex] = m.fieldName;
      });

    const mapping: ImportMapping = {
      columnMapping,
      plotId: this.importForm.value.plotId,
      sheetName: this.importForm.value.sheetName || undefined,
      startRow: this.importForm.value.startRow,
      autoCreateSpecies: this.importForm.value.autoCreateSpecies
    };

    this.dataImportService.importSpecimens(this.selectedFile, mapping).subscribe({
      next: (result) => {
        this.uploading = false;
        this.importResult = result;
        
        if (result.errorCount === 0) {
          this.messageService.add({
            severity: 'success',
            summary: 'Sucesso',
            detail: `${result.successCount} espécimes importados com sucesso!`
          });
        } else {
          this.messageService.add({
            severity: 'warn',
            summary: 'Importação Concluída com Erros',
            detail: `${result.successCount} sucesso, ${result.errorCount} erros`
          });
        }
      },
      error: (error) => {
        this.uploading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: error.error?.message || 'Erro ao importar dados'
        });
      }
    });
  }

  getSeverity(errorCount: number): string {
    if (errorCount === 0) return 'success';
    if (errorCount < 5) return 'warning';
    return 'danger';
  }

  reset(): void {
    this.selectedFile = null;
    this.importResult = null;
    this.filePreview = [];
    this.previewColumns = [];
    this.importForm.reset({
      plotId: null,
      sheetName: '',
      startRow: 1,
      autoCreateSpecies: true
    });
    this.columnMappings = [
      { columnIndex: 0, fieldName: '' },
      { columnIndex: 1, fieldName: '' },
      { columnIndex: 2, fieldName: '' },
      { columnIndex: 3, fieldName: '' },
      { columnIndex: 4, fieldName: '' }
    ];
  }
}
