import { 
  Component, 
  OnInit, 
  AfterViewInit, 
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ElementRef, 
  ViewChild,
  Input,
  Output,
  EventEmitter,
  forwardRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ToolbarModule } from 'primeng/toolbar';
import { DividerModule } from 'primeng/divider';
import { FileUploadModule } from 'primeng/fileupload';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

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
import { Polygon, MultiPolygon } from 'ol/geom';
import { Fill, Stroke, Style, Circle as CircleStyle } from 'ol/style';
import { Coordinate } from 'ol/coordinate';
import BaseEvent from 'ol/events/Event';
import GeoJSON from 'ol/format/GeoJSON';
import WKT from 'ol/format/WKT';
import KML from 'ol/format/KML';

@Component({
  selector: 'app-geometry-map',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    TooltipModule,
    ToolbarModule,
    DividerModule,
    FileUploadModule,
    ToastModule
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => GeometryMapComponent),
      multi: true
    },
    MessageService
  ],
  templateUrl: './geometry-map.component.html',
  styleUrls: ['./geometry-map.component.scss']
})
export class GeometryMapComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges, ControlValueAccessor {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef<HTMLDivElement>;

  // Inputs para customização
  @Input() height: string = 'calc(100vh - 250px)';
  @Input() minHeight: string = '600px';
  @Input() centerLat: number = -15.7801;  // Brasília
  @Input() centerLon: number = -47.9292;  // Brasília
  @Input() initialZoom: number = 12;
  @Input() maxZoom: number = 16;
  @Input() showClearButton: boolean = true;
  @Input() fillColor: string = 'rgba(16, 185, 129, 0.2)';
  @Input() strokeColor: string = 'rgb(16, 185, 129)';
  @Input() strokeWidth: number = 3;
  @Input() disabled: boolean = false;
  
  // Helper geometry (geometria auxiliar de referência, ex: área da CollectionArea)
  @Input() helperGeometry: string | null = null;
  @Input() helperFillColor: string = 'rgba(59, 130, 246, 0.1)';
  @Input() helperStrokeColor: string = 'rgb(59, 130, 246)';
  @Input() helperStrokeWidth: number = 2;

  // Output para eventos
  @Output() geometryChange = new EventEmitter<string | null>();
  @Output() drawStart = new EventEmitter<void>();
  @Output() drawEnd = new EventEmitter<string>();

  // Estado interno
  map?: Map;
  vectorSource!: VectorSource;
  vectorLayer!: VectorLayer<VectorSource>;
  
  // Helper layer (geometria de referência)
  helperVectorSource!: VectorSource;
  helperVectorLayer!: VectorLayer<VectorSource>;
  
  draw?: Draw;
  modify?: Modify;
  snap?: Snap;
  helperSnap?: Snap; // Snap para a geometria helper
  hasDrawnPolygon = false;

  // Estado das ferramentas
  isDrawingActive = false;
  private isModifying = false;

  // Formatadores OpenLayers
  private geoJSONFormat = new GeoJSON();
  private wktFormat = new WKT();
  private kmlFormat = new KML();

  // ControlValueAccessor
  private onChange: (value: string | null) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private messageService: MessageService) {}

  ngOnInit(): void {
    // Observar mudanças na geometria auxiliar
    // Nota: Para mudanças dinâmicas, usar ngOnChanges seria melhor
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

  /**
   * Detecta mudanças nos inputs (principalmente helperGeometry)
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['helperGeometry'] && !changes['helperGeometry'].firstChange) {
      this.updateHelperGeometry();
    }
  }

  /**
   * Atualiza a geometria auxiliar (helper) no mapa
   */
  private updateHelperGeometry(): void {
    if (!this.helperVectorSource || !this.map) {
      return;
    }

    // Limpar geometria auxiliar anterior
    this.helperVectorSource.clear();

    // Se não houver geometria auxiliar, apenas retornar
    if (!this.helperGeometry) {
      return;
    }

    try {
      const coordinates = this.parseGeometry(this.helperGeometry);
      
      if (coordinates.length > 0) {
        const polygon = new Polygon([coordinates.map(coord => fromLonLat(coord))]);
        const feature = new Feature({ geometry: polygon });
        
        this.helperVectorSource.addFeature(feature);

        // Criar/recriar helperSnap se ainda não existir
        if (!this.helperSnap) {
          this.helperSnap = new Snap({
            source: this.helperVectorSource
          });
          this.map.addInteraction(this.helperSnap);
        }

        // Se não houver polígono desenhado ainda, ajustar view para mostrar a geometria auxiliar
        if (!this.hasDrawnPolygon) {
          this.zoomToHelperGeometry();
        }
      }
    } catch (error) {
      console.error('Erro ao carregar geometria auxiliar:', error);
    }
  }

  /**
   * Ajusta o zoom para mostrar a geometria auxiliar
   */
  private zoomToHelperGeometry(): void {
    if (!this.map || !this.helperVectorSource) return;
    
    const features = this.helperVectorSource.getFeatures();
    if (features.length === 0) return;
    
    const extent = features[0].getGeometry()?.getExtent();
    if (extent) {
      this.map.getView().fit(extent, {
        padding: [50, 50, 50, 50],
        maxZoom: this.maxZoom,
        duration: 500
      });
    }
  }

  initializeMap(): void {
    if (!this.mapContainer) return;

    // Criar source e layer para geometria auxiliar (helper)
    this.helperVectorSource = new VectorSource();
    
    this.helperVectorLayer = new VectorLayer({
      source: this.helperVectorSource,
      style: new Style({
        fill: new Fill({
          color: this.helperFillColor
        }),
        stroke: new Stroke({
          color: this.helperStrokeColor,
          width: this.helperStrokeWidth,
          lineDash: [5, 5] // Linha tracejada para diferenciar
        })
      }),
      zIndex: 1 // Abaixo da camada principal
    });

    // Criar source e layer para vetores principais
    this.vectorSource = new VectorSource();
    
    this.vectorLayer = new VectorLayer({
      source: this.vectorSource,
      style: new Style({
        fill: new Fill({
          color: this.fillColor
        }),
        stroke: new Stroke({
          color: this.strokeColor,
          width: this.strokeWidth
        }),
        image: new CircleStyle({
          radius: 7,
          fill: new Fill({
            color: this.strokeColor
          }),
          stroke: new Stroke({
            color: '#fff',
            width: 2
          })
        })
      }),
      zIndex: 2 // Acima da camada helper
    });

    // Criar mapa
    this.map = new Map({
      target: this.mapContainer.nativeElement,
      layers: [
        new TileLayer({
          source: new OSM()
        }),
        this.helperVectorLayer, // Camada auxiliar primeiro (atrás)
        this.vectorLayer        // Camada principal por cima
      ],
      view: new View({
        center: fromLonLat([this.centerLon, this.centerLat]),
        zoom: this.initialZoom
      })
    });

    // Carregar geometria auxiliar se fornecida
    if (this.helperGeometry) {
      this.updateHelperGeometry();
    }

    // Adicionar evento para mudar cursor quando hover sobre features
    this.map.on('pointermove', (evt: any) => {
      if (this.disabled || this.isDrawingActive) return;
      
      const mapElement = this.map!.getTargetElement() as HTMLElement;
      if (!mapElement || !this.hasDrawnPolygon) return;

      // Se estiver modificando, manter cursor grabbing
      if (this.isModifying) {
        mapElement.style.cursor = 'grabbing';
        return;
      }

      // Caso contrário, verificar se está sobre o polígono
      const pixel = this.map!.getEventPixel(evt.originalEvent);
      const hit = this.map!.hasFeatureAtPixel(pixel);
      mapElement.style.cursor = hit ? 'grab' : 'default';
    });

    // Inicializar interações de modificação e snap (sempre disponíveis)
    this.initializeModifyAndSnap();
  }

  initializeModifyAndSnap(): void {
    if (!this.map || this.disabled) return;

    // Modificar geometria existente
    this.modify = new Modify({
      source: this.vectorSource,
      style: new Style({
        image: new CircleStyle({
          radius: 8,
          fill: new Fill({
            color: 'rgba(239, 68, 68, 0.8)'
          }),
          stroke: new Stroke({
            color: '#fff',
            width: 2
          })
        })
      })
    });

    // Evento ao modificar
    this.modify.on('modifystart', () => {
      this.isModifying = true;
      const mapElement = this.map?.getTargetElement() as HTMLElement;
      if (mapElement) {
        mapElement.style.cursor = 'grabbing';
      }
    });

    this.modify.on('modifyend', (evt) => {
      this.isModifying = false;
      const mapElement = this.map?.getTargetElement() as HTMLElement;
      if (mapElement) {
        // mapElement.style.cursor = 'default';
        if (this.disabled || this.isDrawingActive) return;
      
        const mapElement = this.map!.getTargetElement() as HTMLElement;
        if (!mapElement || !this.hasDrawnPolygon) return;

        // Se estiver modificando, manter cursor grabbing
        if (this.isModifying) {
          mapElement.style.cursor = 'grabbing';
          return;
        }

        // Caso contrário, verificar se está sobre o polígono
        const pixel = this.map!.getEventPixel(evt.mapBrowserEvent.originalEvent);
        const hit = this.map!.hasFeatureAtPixel(pixel);
        mapElement.style.cursor = hit ? 'grab' : 'default';
      }
      
      const geometry = this.getGeometryFromMap();
      if (geometry) {
        this.onChange(geometry);
        this.geometryChange.emit(geometry);
      }
    });

    // Snap para facilitar o ajuste - incluindo helper geometry
    this.snap = new Snap({
      source: this.vectorSource
    });

    // Adicionar snap também para a geometria helper (mantém referência para reusar)
    if (this.helperVectorSource) {
      this.helperSnap = new Snap({
        source: this.helperVectorSource
      });
      this.map.addInteraction(this.helperSnap);
    }

    // Adicionar modify e snap ao mapa (sempre ativos)
    this.map.addInteraction(this.modify);
    this.map.addInteraction(this.snap);
  }

  // Controle de ferramentas
  toggleDrawing(): void {
    if (this.disabled) return;
    
    if (this.isDrawingActive) {
      this.deactivateDrawTool();
    } else {
      this.activateDrawTool();
    }
  }

  activateDrawTool(): void {
    if (this.disabled || this.hasDrawnPolygon) return;
    
    this.isDrawingActive = true;
    
    if (!this.draw) {
      this.createDrawInteraction();
    }
    
    if (this.map && this.draw) {
      this.map.addInteraction(this.draw);
      
      // IMPORTANTE: Snap deve ser adicionado DEPOIS do Draw para funcionar corretamente
      // Re-adicionar o snap principal
      if (this.snap) {
        this.map.removeInteraction(this.snap);
        this.map.addInteraction(this.snap);
      }
      
      // Re-adicionar snap para helper geometry
      if (this.helperSnap) {
        this.map.removeInteraction(this.helperSnap);
        this.map.addInteraction(this.helperSnap);
      }
    }
  }

  deactivateDrawTool(): void {
    if (!this.map || !this.draw) return;
    
    this.map.removeInteraction(this.draw);
    this.isDrawingActive = false;
  }

  createDrawInteraction(): void {
    if (!this.map || this.disabled) return;

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

    // Evento ao começar a desenhar
    this.draw.on('drawstart', () => {
      this.vectorSource.clear();
      this.hasDrawnPolygon = false;
      this.drawStart.emit();
    });

    // Evento ao finalizar desenho
    this.draw.on('drawend', () => {
      this.hasDrawnPolygon = true;
      // Desativar ferramenta de desenho após finalizar
      setTimeout(() => {
        this.deactivateDrawTool();
        const geometry = this.getGeometryFromMap();
        if (geometry) {
          this.onChange(geometry);
          this.onTouched();
          this.geometryChange.emit(geometry);
          this.drawEnd.emit(geometry);
        }
      }, 100);
    });
  }

  removeDrawInteraction(): void {
    if (this.map) {
      if (this.draw) this.map.removeInteraction(this.draw);
      if (this.modify) this.map.removeInteraction(this.modify);
      if (this.snap) this.map.removeInteraction(this.snap);
    }
  }

  loadGeometry(geometry: string): void {
    if (!this.vectorSource || !this.map) {
      setTimeout(() => this.loadGeometry(geometry), 100);
      return;
    }

    try {
      const coordinates = this.parseGeometry(geometry);
      
      if (coordinates.length > 0) {
        const polygon = new Polygon([coordinates.map(coord => fromLonLat(coord))]);
        const feature = new Feature({ geometry: polygon });
        
        this.vectorSource.clear();
        this.vectorSource.addFeature(feature);
        this.hasDrawnPolygon = true;

        // Ajustar view para mostrar o polígono
        this.zoomToPolygon();
      }
    } catch (error) {
      console.error('Erro ao carregar geometria:', error);
    }
  }

  // Método auxiliar para zoom no polígono
  zoomToPolygon(): void {
    if (!this.map || !this.hasDrawnPolygon) return;
    
    const features = this.vectorSource.getFeatures();
    if (features.length === 0) return;
    
    const extent = features[0].getGeometry()?.getExtent();
    if (extent) {
      this.map.getView().fit(extent, {
        padding: [50, 50, 50, 50],
        maxZoom: this.maxZoom,
        duration: 500
      });
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

    // Formato GeoJSON
    try {
      const geojson = JSON.parse(geometry);
      if (geojson.type === 'Polygon' && geojson.coordinates) {
        return geojson.coordinates[0] as [number, number][];
      }
    } catch (e) {
      // Não é JSON
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
    this.onChange(null);
    this.onTouched();
    this.geometryChange.emit(null);
  }

  updateMapSize(): void {
    if (this.map) {
      this.map.updateSize();
    }
  }

  // ========== IMPORTAÇÃO DE GEOMETRIAS ==========

  /**
   * Importa geometria de um arquivo
   */
  onFileSelect(event: any): void {
    const file = event.files[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = (e: any) => {
      const content = e.target.result;
      this.importGeometry(content, file.name);
    };

    reader.readAsText(file);
  }

  /**
   * Importa geometria de diferentes formatos
   */
  importGeometry(content: string, filename: string): void {
    try {
      let features: Feature[] = [];
      const extension = filename.split('.').pop()?.toLowerCase();

      // Tentar detectar e importar baseado no formato
      if (extension === 'geojson' || extension === 'json') {
        features = this.importGeoJSON(content);
      } else if (extension === 'kml') {
        features = this.importKML(content);
      } else if (extension === 'wkt' || extension === 'txt') {
        features = this.importWKT(content);
      } else {
        // Tentar auto-detectar
        features = this.autoDetectFormat(content);
      }

      if (features.length > 0) {
        this.loadFeaturesIntoMap(features);
        this.messageService.add({
          severity: 'success',
          summary: 'Importação Bem-sucedida',
          detail: `Polígono importado de ${filename}`,
          life: 3000
        });
      } else {
        throw new Error('Nenhuma geometria válida encontrada');
      }
    } catch (error: any) {
      console.error('Erro ao importar geometria:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Erro na Importação',
        detail: error.message || 'Formato de arquivo não suportado',
        life: 5000
      });
    }
  }

  /**
   * Importa de GeoJSON
   */
  private importGeoJSON(content: string): Feature[] {
    try {
      const features = this.geoJSONFormat.readFeatures(content, {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857'
      });
      
      if (features.length === 0) {
        throw new Error('Nenhuma geometria encontrada no arquivo GeoJSON');
      }
      
      return this.filterPolygons(features);
    } catch (e: any) {
      console.error('Erro ao processar GeoJSON:', e);
      throw new Error(`Erro ao processar GeoJSON: ${e.message || 'formato inválido'}`);
    }
  }

  /**
   * Importa de KML
   */
  private importKML(content: string): Feature[] {
    try {
      const features = this.kmlFormat.readFeatures(content, {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857'
      });
      return this.filterPolygons(features);
    } catch (e) {
      throw new Error('Formato KML inválido');
    }
  }

  /**
   * Importa de WKT
   */
  private importWKT(content: string): Feature[] {
    try {
      const feature = this.wktFormat.readFeature(content.trim(), {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857'
      });
      return this.filterPolygons([feature]);
    } catch (e) {
      throw new Error('Formato WKT inválido');
    }
  }

  /**
   * Tenta auto-detectar o formato
   */
  private autoDetectFormat(content: string): Feature[] {
    const trimmed = content.trim();

    // Tentar GeoJSON
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return this.importGeoJSON(trimmed);
      } catch (e) {
        // Continuar tentando outros formatos
      }
    }

    // Tentar KML
    if (trimmed.startsWith('<')) {
      try {
        return this.importKML(trimmed);
      } catch (e) {
        // Continuar tentando outros formatos
      }
    }

    // Tentar WKT
    if (trimmed.toUpperCase().startsWith('POLYGON')) {
      try {
        return this.importWKT(trimmed);
      } catch (e) {
        // Continuar tentando outros formatos
      }
    }

    throw new Error('Formato não reconhecido. Use GeoJSON, KML ou WKT.');
  }

  /**
   * Filtra apenas polígonos das features e converte MultiPolygon em Polygon
   */
  private filterPolygons(features: Feature[]): Feature[] {
    const polygons: Feature[] = [];

    for (const feature of features) {
      const geometry = feature.getGeometry();
      
      if (!geometry) continue;

      const geomType = geometry.getType();

      if (geomType === 'Polygon') {
        // Já é um polígono, adicionar diretamente
        polygons.push(feature);
      } else if (geomType === 'MultiPolygon') {
        // Converter MultiPolygon em múltiplos Polygons
        const multiPolygon = geometry as MultiPolygon;
        const polygonGeometries = multiPolygon.getPolygons();
        
        // Pegar apenas o primeiro polígono do MultiPolygon
        if (polygonGeometries.length > 0) {
          const newFeature = new Feature({
            geometry: polygonGeometries[0]
          });
          polygons.push(newFeature);
        }
      }
    }

    return polygons;
  }

  /**
   * Carrega features no mapa
   */
  private loadFeaturesIntoMap(features: Feature[]): void {
    if (features.length === 0) {
      throw new Error('Nenhum polígono encontrado no arquivo');
    }

    // Limpar mapa e adicionar primeira feature (polígono)
    this.vectorSource.clear();
    this.vectorSource.addFeature(features[0]);
    this.hasDrawnPolygon = true;

    // Ajustar zoom para mostrar o polígono
    this.zoomToPolygon();

    // Emitir mudança
    const geometry = this.getGeometryFromMap();
    if (geometry) {
      this.onChange(geometry);
      this.onTouched();
      this.geometryChange.emit(geometry);
    }

    // Se houver mais de um polígono ou foi MultiPolygon, avisar
    if (features.length > 1) {
      this.messageService.add({
        severity: 'info',
        summary: 'Múltiplas Geometrias',
        detail: `Apenas a primeira geometria foi importada (${features.length} encontradas)`,
        life: 4000
      });
    }
  }

  // ========== FIM IMPORTAÇÃO ==========

  // ControlValueAccessor implementation
  writeValue(value: string | null): void {
    if (value) {
      this.loadGeometry(value);
    } else {
      if (this.vectorSource) {
        this.vectorSource.clear();
        this.hasDrawnPolygon = false;
      }
    }
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
