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
  speciesCount = 0; // TODO: Implementar contagem real de espécies

  constructor(
    private collectionAreaService: CollectionAreaService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    // TODO: Buscar contagem de espécies da área
    this.speciesCount = Math.floor(Math.random() * 50); // Mock temporário
  }

  ngAfterViewInit(): void {
    // Pequeno delay para garantir que o DOM está pronto
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
      // Parse da geometria (assumindo formato WKT ou GeoJSON)
      const coordinates = this.parseGeometry(this.area.geometry);
      
      if (!coordinates || coordinates.length === 0) {
        console.warn('Geometria inválida para a área:', this.area.id);
        return;
      }

      // Criar feature com a geometria
      const polygon = new Polygon([coordinates.map(coord => fromLonLat(coord))]);
      const feature = new Feature({
        geometry: polygon
      });

      // Estilo do polígono
      const vectorSource = new VectorSource({
        features: [feature]
      });

      const vectorLayer = new VectorLayer({
        source: vectorSource,
        style: new Style({
          fill: new Fill({
            color: 'rgba(16, 185, 129, 0.2)' // emerald-500 com transparência
          }),
          stroke: new Stroke({
            color: 'rgb(16, 185, 129)', // emerald-500
            width: 2
          })
        })
      });

      // Criar mapa
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
          // Desabilitar interações para mapa estático
          enableRotation: false
        }),
        controls: [], // Remover controles para deixar mais limpo
        interactions: [] // Remover todas as interações (zoom, pan, etc)
      });

      // Ajustar zoom para mostrar toda a geometria
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
      // Tentar parsear como GeoJSON primeiro
      const geojson = JSON.parse(geometry);
      if (geojson.type === 'Polygon' && geojson.coordinates) {
        return geojson.coordinates[0] as [number, number][];
      }
      
      // Se não for GeoJSON, tentar como WKT simplificado
      // POLYGON((lon lat, lon lat, ...))
      const match = geometry.match(/POLYGON\s*\(\(([\d\s,.-]+)\)\)/i);
      if (match) {
        const coordsString = match[1];
        return coordsString.split(',').map(pair => {
          const [lon, lat] = pair.trim().split(/\s+/).map(Number);
          return [lon, lat] as [number, number];
        });
      }

      // Fallback: geometria mock para demonstração
      return this.getMockGeometry();
    } catch (error) {
      console.warn('Erro ao parsear geometria, usando mock:', error);
      return this.getMockGeometry();
    }
  }

  getMockGeometry(): [number, number][] {
    // Geometria de exemplo próxima a Brasília
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
      message: `Tem certeza que deseja excluir a área "${this.area.name}"?`,
      header: 'Confirmar Exclusão',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sim, excluir',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
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
    if (!name) return '#6b7280'; // cor padrão se não houver nome
    
    // Array de cores harmoniosas para avatares
    const colors = [
      '#ef4444', // red-500
      '#f97316', // orange-500
      '#eab308', // yellow-500
      '#22c55e', // green-500
      '#10b981', // emerald-500
      '#06b6d4', // cyan-500
      '#3b82f6', // blue-500
      '#6366f1', // indigo-500
      '#8b5cf6', // violet-500
      '#a855f7', // purple-500
      '#ec4899', // pink-500
      '#f43f5e', // rose-500
    ];
    
    // Gerar um hash simples do nome
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Usar o hash para selecionar uma cor
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  }
}
