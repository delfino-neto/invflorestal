import { Component, Input, Output, EventEmitter, OnInit, AfterViewInit, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmationService, MessageService } from 'primeng/api';

// PrimeNG
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ChipModule } from 'primeng/chip';
import { AvatarModule } from 'primeng/avatar';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';

// OpenLayers
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { fromLonLat } from 'ol/proj';
import { Feature } from 'ol';
import { Polygon } from 'ol/geom';
import { Fill, Stroke, Style } from 'ol/style';

// Services & Models
import { CollectionAreaService } from '@/core/services/collection-area.service';
import { CollectionArea } from '@/core/models/collection/collection-area';

@Component({
  selector: 'app-collection-area-card',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    TagModule,
    TooltipModule,
    ChipModule,
    AvatarModule,
    ConfirmDialogModule,
    ToastModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './collection-area-card.component.html',
  styleUrls: ['./collection-area-card.component.scss']
})
export class CollectionAreaCardComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() area!: CollectionArea;
  @Output() view = new EventEmitter<number>();
  @Output() edit = new EventEmitter<number>();
  @Output() delete = new EventEmitter<number>();

  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef<HTMLDivElement>;

  private map?: Map;
  speciesCount = 0;

  constructor(
    private collectionAreaService: CollectionAreaService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.speciesCount = this.area.specimensCount || 0;
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initializeMap();
    }, 100);
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.setTarget(undefined);
    }
  }

  initializeMap(): void {
    if (!this.mapContainer || !this.area.geometry) {
      return;
    }

    try {
      const coordinates = this.parseGeometry(this.area.geometry);
      
      if (!coordinates || coordinates.length === 0) {
        console.warn('Geometria inválida para a área:', this.area.id);
        return;
      }

      const polygon = new Polygon([coordinates.map(coord => fromLonLat(coord))]);
      const feature = new Feature({
        geometry: polygon
      });

      const vectorSource = new VectorSource({
        features: [feature]
      });

      const vectorLayer = new VectorLayer({
        source: vectorSource,
        style: new Style({
          fill: new Fill({
            color: 'rgba(59, 130, 246, 0.2)'
          }),
          stroke: new Stroke({
            color: 'rgb(59, 130, 246)',
            width: 2
          })
        })
      });

      this.map = new Map({
        target: this.mapContainer.nativeElement,
        layers: [
          new TileLayer({
            source: new OSM()
          }),
          vectorLayer
        ],
        view: new View({
          center: fromLonLat(this.getCenterCoordinate(coordinates)),
          zoom: 14,
          enableRotation: false
        }),
        controls: [],
        interactions: []
      });

      const extent = polygon.getExtent();
      this.map.getView().fit(extent, {
        padding: [20, 20, 20, 20],
        maxZoom: 16
      });

    } catch (error) {
      console.error('Erro ao inicializar mapa:', error);
    }
  }

  parseGeometry(geometry: string): [number, number][] {
    try {
      if (geometry.startsWith('((') && geometry.endsWith('))')) {
        const cleanedGeometry = geometry.slice(2, -2);
        
        const coordinates = cleanedGeometry.split('),(').map(pair => {
          const [lon, lat] = pair.split(',').map(Number);
          return [lon, lat] as [number, number];
        });
        
        return coordinates;
      }
      
      const geojson = JSON.parse(geometry);
      if (geojson.type === 'Polygon' && geojson.coordinates) {
        return geojson.coordinates[0] as [number, number][];
      }
      
      const match = geometry.match(/POLYGON\s*\(\(([\d\s,.-]+)\)\)/i);
      if (match) {
        const coordsString = match[1];
        const coordinates = coordsString.split(',').map(pair => {
          const [lon, lat] = pair.trim().split(/\s+/).map(Number);
          return [lon, lat] as [number, number];
        });
        return coordinates;
      }

      console.warn('Formato de geometria não reconhecido, usando mock');
      return this.getMockGeometry();
    } catch (error) {
      console.warn('Erro ao parsear geometria, usando mock:', error);
      return this.getMockGeometry();
    }
  }

  getMockGeometry(): [number, number][] {
    const baseLon = -47.9 + (Math.random() * 0.1);
    const baseLat = -15.8 + (Math.random() * 0.1);
    const size = 0.01;
    
    return [
      [baseLon, baseLat],
      [baseLon + size, baseLat],
      [baseLon + size, baseLat + size],
      [baseLon, baseLat + size],
      [baseLon, baseLat]
    ];
  }

  getCenterCoordinate(coordinates: [number, number][]): [number, number] {
    const sumLon = coordinates.reduce((sum, coord) => sum + coord[0], 0);
    const sumLat = coordinates.reduce((sum, coord) => sum + coord[1], 0);
    return [sumLon / coordinates.length, sumLat / coordinates.length];
  }

  onView(): void {
    if (this.area.id) {
      this.view.emit(this.area.id);
    }
  }

  onEdit(): void {
    if (this.area.id) {
      this.edit.emit(this.area.id);
    }
  }

  onDelete(): void {
    this.confirmationService.confirm({
      message: 'Esta ação não pode ser desfeita. Todos os dados associados a esta área de coleta serão perdidos.',
      header: 'Tem certeza?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Excluir área',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-outlined',
      accept: () => {
        if (this.area.id) {
          this.collectionAreaService.delete(this.area.id).subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Sucesso',
                detail: 'Área de coleta excluída com sucesso'
              });
              this.delete.emit(this.area.id);
            },
            error: (error) => {
              console.error('Erro ao excluir área:', error);
              this.messageService.add({
                severity: 'error',
                summary: 'Erro',
                detail: 'Erro ao excluir área de coleta'
              });
            }
          });
        }
      }
    });
  }

  formatDate(date?: Date): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getInitials(name?: string): string {
    if (!name) return 'NA';
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  }

  getUserAvatarColor(name?: string): string {
    if (!name) return '#6b7280';
    
    const colors = [
      '#ef4444',
      '#f97316',
      '#eab308',
      '#22c55e',
      '#10b981',
      '#06b6d4',
      '#3b82f6',
      '#6366f1',
      '#8b5cf6',
      '#a855f7',
      '#ec4899',
      '#f43f5e',
    ];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  }
}
