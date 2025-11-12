import { 
  Component, 
  OnInit, 
  AfterViewInit, 
  OnDestroy, 
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
import BaseEvent from 'ol/events/Event';

@Component({
  selector: 'app-geometry-map',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    TooltipModule,
    ToolbarModule,
    DividerModule
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => GeometryMapComponent),
      multi: true
    }
  ],
  templateUrl: './geometry-map.component.html',
  styleUrls: ['./geometry-map.component.scss']
})
export class GeometryMapComponent implements OnInit, AfterViewInit, OnDestroy, ControlValueAccessor {
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

  // Output para eventos
  @Output() geometryChange = new EventEmitter<string | null>();
  @Output() drawStart = new EventEmitter<void>();
  @Output() drawEnd = new EventEmitter<string>();

  // Estado interno
  map?: Map;
  vectorSource!: VectorSource;
  vectorLayer!: VectorLayer<VectorSource>;
  draw?: Draw;
  modify?: Modify;
  snap?: Snap;
  hasDrawnPolygon = false;

  // Estado das ferramentas
  isDrawingActive = false;
  private isModifying = false;

  // ControlValueAccessor
  private onChange: (value: string | null) => void = () => {};
  private onTouched: () => void = () => {};

  ngOnInit(): void {}

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
    if (!this.mapContainer) return;

    // Criar source e layer para vetores
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
      })
    });

    // Criar mapa
    this.map = new Map({
      target: this.mapContainer.nativeElement,
      layers: [
        new TileLayer({
          source: new OSM()
        }),
        this.vectorLayer
      ],
      view: new View({
        center: fromLonLat([this.centerLon, this.centerLat]),
        zoom: this.initialZoom
      })
    });

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

    // Snap para facilitar o ajuste
    this.snap = new Snap({
      source: this.vectorSource
    });

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
