import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormControl, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DividerModule } from 'primeng/divider';
import { ToastModule } from 'primeng/toast';
import { PlotService } from '@/core/services/plot.service';
import { Plot, PlotRequest } from '@/core/models/collection/plot';
import { GeometryMapComponent } from '@/shared/components/geometry-map';

@Component({
  selector: 'app-plot-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    DividerModule,
    ToastModule,
    GeometryMapComponent
  ],
  providers: [MessageService],
  templateUrl: './plot-dialog.component.html',
  styleUrls: ['./plot-dialog.component.scss']
})
export class PlotDialogComponent implements OnInit, OnChanges {
  @Input() visible = false;
  @Input() areaId!: number;
  @Input() plot?: Plot;
  @Input() areaGeometry?: string;
  @Input() otherPlots: Array<{ geometry: string; label: string }> = [];
  
  @Output() onClose = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<Plot>();

  form!: FormGroup;
  isSubmitting = false;
  
  isEditMode = false;

  constructor(
    private fb: FormBuilder,
    private plotService: PlotService,
    private messageService: MessageService
  ) {
    this.createForm();
  }

  ngOnInit(): void {
    this.initializeForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['plot'] || changes['visible']) {
      this.initializeForm();
    }
  }

  createForm(): void {
    this.form = this.fb.group({
      plotCode: ['', [Validators.required, Validators.minLength(2)]],
      areaM2: [null, [Validators.required, Validators.min(0.01)]],
      slopeDeg: [null, [Validators.min(0), Validators.max(90)]],
      aspectDeg: [null, [Validators.min(0), Validators.max(360)]],
      notes: [''],
      geometry: ['', Validators.required]
    });
  }

  initializeForm(): void {
    this.isEditMode = !!this.plot;
    
    if (this.plot) {
      this.form.patchValue({
        plotCode: this.plot.plotCode,
        areaM2: this.plot.areaM2,
        slopeDeg: this.plot.slopeDeg,
        aspectDeg: this.plot.aspectDeg,
        notes: this.plot.notes,
        geometry: this.plot.geometry
      });
    } else {
      this.form.reset();
    }

    // Subscribe to geometry changes to auto-calculate area
    this.geometryControl.valueChanges.subscribe(geometry => {
      if (geometry && !this.isEditMode) {
        this.calculateAreaFromGeometry(geometry);
      }
    });
  }

  calculateAreaFromGeometry(geometryWKT: string): void {
    try {
      // Parse geometry (formato PostgreSQL: ((x1,y1),(x2,y2),...))
      let coordinates: [number, number][] = [];

      if (geometryWKT.startsWith('((') && geometryWKT.endsWith('))')) {
        // Formato PostgreSQL
        const cleanedGeometry = geometryWKT.slice(2, -2);
        coordinates = cleanedGeometry.split('),(').map(pair => {
          const [lon, lat] = pair.split(',').map(Number);
          return [lon, lat] as [number, number];
        });
      } else {
        // Tentar GeoJSON
        try {
          const geojson = JSON.parse(geometryWKT);
          if (geojson.type === 'Polygon' && geojson.coordinates) {
            coordinates = geojson.coordinates[0];
          }
        } catch {
          console.warn('Formato de geometria não reconhecido para cálculo de área');
          return;
        }
      }

      if (coordinates.length < 3) return;

      // Calcular área usando fórmula de Shoelace (em graus)
      // Depois converter para m² usando aproximação no equador
      const areaInDegrees = this.calculatePolygonAreaDegrees(coordinates);
      
      // Converter de graus² para m²
      // 1 grau de latitude ≈ 111,320 metros
      // 1 grau de longitude varia com latitude, mas usamos aproximação média
      const avgLat = coordinates.reduce((sum, coord) => sum + coord[1], 0) / coordinates.length;
      const latMeters = 111320; // metros por grau de latitude
      const lonMeters = 111320 * Math.cos(avgLat * Math.PI / 180); // metros por grau de longitude
      
      const areaM2 = Math.abs(areaInDegrees * latMeters * lonMeters);

      // Auto-preencher apenas se ainda não foi preenchido
      if (!this.form.get('areaM2')?.value || this.form.get('areaM2')?.value === 0) {
        this.form.patchValue({ areaM2: Math.round(areaM2 * 100) / 100 }, { emitEvent: false });
      }
    } catch (error) {
      console.error('Erro ao calcular área:', error);
    }
  }

  private calculatePolygonAreaDegrees(coordinates: [number, number][]): number {
    let area = 0;
    const n = coordinates.length;

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += coordinates[i][0] * coordinates[j][1];
      area -= coordinates[j][0] * coordinates[i][1];
    }

    return Math.abs(area / 2);
  }

  get geometryControl(): FormControl {
    return this.form.get('geometry') as FormControl;
  }

  get hasDrawnGeometry(): boolean {
    return !!this.form.get('geometry')?.value;
  }

  save(): void {
    if (this.form.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atenção',
        detail: 'Preencha todos os campos obrigatórios e desenhe o plot no mapa'
      });
      return;
    }

    this.isSubmitting = true;
    
    const request: PlotRequest = {
      areaId: this.areaId,
      plotCode: this.form.value.plotCode,
      geometry: this.form.value.geometry,
      areaM2: this.form.value.areaM2,
      slopeDeg: this.form.value.slopeDeg,
      aspectDeg: this.form.value.aspectDeg,
      notes: this.form.value.notes
    };

    const operation = this.isEditMode && this.plot?.id
      ? this.plotService.update(this.plot.id, request)
      : this.plotService.create(request);

    operation.subscribe({
      next: (plot) => {
        this.isSubmitting = false;
        this.onSave.emit(plot);
      },
      error: (error) => {
        console.error('Erro ao salvar plot:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Erro ao salvar plot'
        });
        this.isSubmitting = false;
      }
    });
  }

  close(): void {
    this.form.reset();
    this.onClose.emit();
  }

  get dialogHeader(): string {
    return this.isEditMode ? `Editar Plot: ${this.plot?.plotCode}` : 'Novo Plot';
  }
}
