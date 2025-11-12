import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { trigger, transition, style, animate } from '@angular/animations';

// PrimeNG
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { DividerModule } from 'primeng/divider';
import { TagModule } from 'primeng/tag';

// OpenLayers
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Draw, Modify, Snap } from 'ol/interaction';
import { fromLonLat, toLonLat } from 'ol/proj';
import { Feature } from 'ol';
import { Polygon } from 'ol/geom';
import { Fill, Stroke, Style, Circle as CircleStyle } from 'ol/style';
import { Coordinate } from 'ol/coordinate';

// Services & Models
import { CollectionAreaService } from '@/core/services/collection-area.service';
import { CollectionAreaRequest } from '@/core/models/collection/collection-area';
import { AuthService } from '@/core/services/auth.service';

@Component({
  selector: 'app-collection-area-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    InputTextModule,
    ButtonModule,
    ToastModule,
    DividerModule,
    TagModule
  ],
  providers: [MessageService],
  templateUrl: './collection-area-form.component.html',
  styleUrls: ['./collection-area-form.component.scss'],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.95)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'scale(0.95)' }))
      ])
    ])
  ]
})
export class CollectionAreaFormComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef<HTMLDivElement>;

  form!: FormGroup;
  map?: Map;
  vectorSource!: VectorSource;
  vectorLayer!: VectorLayer<VectorSource>;
  draw?: Draw;
  modify?: Modify;
  snap?: Snap;
  
  isEditMode = false;
  areaId?: number;
  isSubmitting = false;
  hasDrawnPolygon = false;
  isDrawing = false;
  showInstructions = false;
  
  private readonly INSTRUCTIONS_SEEN_KEY = 'collection_area_instructions_seen';

  // Instruções para o usuário
  drawingInstructions = [
    'Clique no mapa para começar a desenhar',
    'Continue clicando para adicionar pontos',
    'Clique duas vezes para finalizar o polígono',
    'Arraste os pontos para ajustar a forma'
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private collectionAreaService: CollectionAreaService,
    private authService: AuthService,
    private messageService: MessageService
  ) {
    this.createForm();
  }

  ngOnInit(): void {
    // Verificar se é modo de edição
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.areaId = +params['id'];
        this.loadArea();
      }
    });

    // Não verificar aqui, será feito após inicializar o mapa
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initializeMap();
      // Mostrar instruções após o mapa estar inicializado
      this.checkIfShouldShowInstructions();
    }, 100);
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.setTarget(undefined);
    }
  }

  createForm(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      notes: ['']
    });
  }

  initializeMap(): void {
    if (!this.mapContainer) return;

    // Criar source e layer para vetores
    this.vectorSource = new VectorSource();
    
    this.vectorLayer = new VectorLayer({
      source: this.vectorSource,
      style: new Style({
        fill: new Fill({
          color: 'rgba(16, 185, 129, 0.2)' // emerald-500 com transparência
        }),
        stroke: new Stroke({
          color: 'rgb(16, 185, 129)', // emerald-500
          width: 3
        }),
        image: new CircleStyle({
          radius: 7,
          fill: new Fill({
            color: 'rgb(16, 185, 129)'
          }),
          stroke: new Stroke({
            color: '#fff',
            width: 2
          })
        })
      })
    });

    // Criar mapa centrado no Brasil
    this.map = new Map({
      target: this.mapContainer.nativeElement,
      layers: [
        new TileLayer({
          source: new OSM()
        }),
        this.vectorLayer
      ],
      view: new View({
        center: fromLonLat([-47.9292, -15.7801]), // Brasília
        zoom: 12
      })
    });

    // Adicionar interações de desenho
    this.addDrawInteraction();
  }

  addDrawInteraction(): void {
    if (!this.map) return;

    // Desenhar polígono
    this.draw = new Draw({
      source: this.vectorSource,
      type: 'Polygon',
      style: new Style({
        fill: new Fill({
          color: 'rgba(16, 185, 129, 0.1)'
        }),
        stroke: new Stroke({
          color: 'rgba(16, 185, 129, 0.7)',
          lineDash: [10, 10],
          width: 2
        }),
        image: new CircleStyle({
          radius: 5,
          fill: new Fill({
            color: 'rgba(16, 185, 129, 0.7)'
          })
        })
      })
    });

    // Evento ao começar a desenhar (primeiro clique)
    this.draw.on('drawstart', () => {
      // Limpar polígonos anteriores
      this.vectorSource.clear();
      // Esconder instruções ao começar a desenhar
      this.isDrawing = true;
      this.hasDrawnPolygon = false;
    });

    // Evento ao finalizar desenho
    this.draw.on('drawend', (event) => {
      this.isDrawing = false;
      this.hasDrawnPolygon = true;
    });

    // Modificar geometria existente
    this.modify = new Modify({
      source: this.vectorSource,
      style: new Style({
        image: new CircleStyle({
          radius: 8,
          fill: new Fill({
            color: 'rgba(239, 68, 68, 0.8)' // red-500
          }),
          stroke: new Stroke({
            color: '#fff',
            width: 2
          })
        })
      })
    });

    // Snap para facilitar o ajuste
    this.snap = new Snap({
      source: this.vectorSource
    });

    this.map.addInteraction(this.draw);
    this.map.addInteraction(this.modify);
    this.map.addInteraction(this.snap);
  }

  checkIfShouldShowInstructions(): void {
    const hasSeenInstructions = localStorage.getItem(this.INSTRUCTIONS_SEEN_KEY);
    if (!hasSeenInstructions && !this.isEditMode) {
      this.showInstructions = true;
    }
  }

  closeInstructions(): void {
    this.showInstructions = false;
    localStorage.setItem(this.INSTRUCTIONS_SEEN_KEY, 'true');
    
    // Forçar atualização do mapa após fechar o modal
    setTimeout(() => {
      if (this.map) {
        this.map.updateSize();
      }
    }, 300);
  }

  onBackdropClick(): void {
    this.closeInstructions();
  }

  loadArea(): void {
    if (!this.areaId) return;

    this.collectionAreaService.findById(this.areaId).subscribe({
      next: (area) => {
        this.form.patchValue({
          name: area.name,
          notes: area.notes
        });

        // Carregar geometria no mapa
        if (area.geometry) {
          this.loadGeometryToMap(area.geometry);
        }
      },
      error: (error) => {
        console.error('Erro ao carregar área:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Erro ao carregar área de coleta'
        });
        this.router.navigate(['/collection-areas']);
      }
    });
  }

  loadGeometryToMap(geometry: string): void {
    try {
      const coordinates = this.parseGeometry(geometry);
      
      if (coordinates.length > 0) {
        const polygon = new Polygon([coordinates.map(coord => fromLonLat(coord))]);
        const feature = new Feature({ geometry: polygon });
        
        this.vectorSource.addFeature(feature);
        this.hasDrawnPolygon = true;

        // Ajustar view para mostrar o polígono
        const extent = polygon.getExtent();
        this.map?.getView().fit(extent, {
          padding: [50, 50, 50, 50],
          maxZoom: 16
        });
      }
    } catch (error) {
      console.error('Erro ao carregar geometria:', error);
    }
  }

  parseGeometry(geometry: string): [number, number][] {
    // Formato PostgreSQL: ((lon1,lat1),(lon2,lat2),...)
    if (geometry.startsWith('((') && geometry.endsWith('))')) {
      const cleanedGeometry = geometry.slice(2, -2);
      return cleanedGeometry.split('),(').map(pair => {
        const [lon, lat] = pair.split(',').map(Number);
        return [lon, lat] as [number, number];
      });
    }
    return [];
  }

  getGeometryFromMap(): string | null {
    const features = this.vectorSource.getFeatures();
    
    if (features.length === 0) {
      return null;
    }

    const feature = features[0];
    const geometry = feature.getGeometry() as Polygon;
    const coordinates = geometry.getCoordinates()[0];

    // Converter de projeção do mapa para lon/lat
    const lonLatCoords = coordinates.map((coord: Coordinate) => {
      const [lon, lat] = toLonLat(coord);
      return `(${lon},${lat})`;
    });

    // Formato PostgreSQL
    return `(${lonLatCoords.join(',')})`;
  }

  clearDrawing(): void {
    this.vectorSource.clear();
    this.hasDrawnPolygon = false;
    this.isDrawing = false;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.markFormGroupTouched(this.form);
      this.messageService.add({
        severity: 'warn',
        summary: 'Atenção',
        detail: 'Preencha todos os campos obrigatórios'
      });
      return;
    }

    const geometry = this.getGeometryFromMap();
    if (!geometry) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atenção',
        detail: 'Desenhe a área no mapa antes de salvar'
      });
      return;
    }

    this.isSubmitting = true;

    // Buscar usuário atual do AuthService
    this.authService.me().subscribe({
      next: (currentUser) => {
        if (!currentUser?.id) {
          this.messageService.add({
            severity: 'error',
            summary: 'Erro',
            detail: 'Usuário não autenticado'
          });
          this.isSubmitting = false;
          return;
        }

        this.saveArea(geometry, currentUser.id);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Erro ao obter usuário autenticado'
        });
        this.isSubmitting = false;
      }
    });
  }

  private saveArea(geometry: string, userId: number): void {
    const request: CollectionAreaRequest = {
      ...this.form.value,
      geometry,
      createdById: userId
    };

    const operation = this.isEditMode && this.areaId
      ? this.collectionAreaService.update(this.areaId, request)
      : this.collectionAreaService.create(request);

    operation.subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Sucesso',
          detail: `Área de coleta ${this.isEditMode ? 'atualizada' : 'criada'} com sucesso`
        });
        setTimeout(() => {
          this.router.navigate(['/collection-areas']);
        }, 1500);
      },
      error: (error) => {
        console.error('Erro ao salvar área:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: `Erro ao ${this.isEditMode ? 'atualizar' : 'criar'} área de coleta`
        });
        this.isSubmitting = false;
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/collection-areas']);
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.form.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return 'Campo obrigatório';
      if (field.errors['minlength']) return `Mínimo de ${field.errors['minlength'].requiredLength} caracteres`;
    }
    return '';
  }
}
