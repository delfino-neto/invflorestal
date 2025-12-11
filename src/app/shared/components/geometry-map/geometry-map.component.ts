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


import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ToolbarModule } from 'primeng/toolbar';
import { DividerModule } from 'primeng/divider';
import { FileUploadModule } from 'primeng/fileupload';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';


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
import { Fill, Stroke, Style, Circle as CircleStyle, Text } from 'ol/style';
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

  @Input() height: string = 'calc(100vh - 250px)';
  @Input() minHeight: string = '600px';
  @Input() centerLat: number = -15.7801;
  @Input() centerLon: number = -47.9292;
  @Input() initialZoom: number = 12;
  @Input() maxZoom: number = 16;
  @Input() showClearButton: boolean = true;
  @Input() fillColor: string = 'rgba(59, 130, 246, 0.2)';
  @Input() strokeColor: string = 'rgb(59, 130, 246)';
  @Input() strokeWidth: number = 3;
  @Input() disabled: boolean = false;
  @Input() helperGeometry: string | null = null;
  @Input() helperFillColor: string = 'rgba(0, 0, 0, 0.2)';
  @Input() helperStrokeColor: string = 'rgba(0, 0, 0, 1)';
  @Input() helperStrokeWidth: number = 2;
  @Input() helperPlots: Array<{ geometry: string; label: string; color?: string }> = [];
  @Output() geometryChange = new EventEmitter<string | null>();
  @Output() drawStart = new EventEmitter<void>();
  @Output() drawEnd = new EventEmitter<string>();
  map?: Map;
  vectorSource!: VectorSource;
  vectorLayer!: VectorLayer<VectorSource>;
  helperVectorSource!: VectorSource;
  helperVectorLayer!: VectorLayer<VectorSource>;
  helperPlotsSource!: VectorSource;
  helperPlotsLayer!: VectorLayer<VectorSource>;
  draw?: Draw;
  modify?: Modify;
  snap?: Snap;
  helperSnap?: Snap;
  helperPlotsSnap?: Snap;
  hasDrawnPolygon = false;
  isDrawingActive = false;
  private isModifying = false;
  private geoJSONFormat = new GeoJSON();
  private wktFormat = new WKT();
  private kmlFormat = new KML();
  private onChange: (value: string | null) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private messageService: MessageService) {}

  ngOnInit(): void {
    
    
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

  
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['helperGeometry'] && !changes['helperGeometry'].firstChange) {
      this.updateHelperGeometry();
    }
    if (changes['helperPlots'] && !changes['helperPlots'].firstChange) {
      this.updateHelperPlots();
    }
  }

  
  private updateHelperGeometry(): void {
    if (!this.helperVectorSource || !this.map) {
      return;
    }

    
    this.helperVectorSource.clear();

    
    if (!this.helperGeometry) {
      return;
    }

    try {
      const coordinates = this.parseGeometry(this.helperGeometry);
      
      if (coordinates.length > 0) {
        const polygon = new Polygon([coordinates.map(coord => fromLonLat(coord))]);
        const feature = new Feature({ geometry: polygon });
        
        this.helperVectorSource.addFeature(feature);

        
        if (!this.helperSnap) {
          this.helperSnap = new Snap({
            source: this.helperVectorSource
          });
          this.map.addInteraction(this.helperSnap);
        } else {
          
          this.map.removeInteraction(this.helperSnap);
          this.map.addInteraction(this.helperSnap);
        }

        
        if (!this.hasDrawnPolygon) {
          this.zoomToHelperGeometry();
        }
      }
    } catch (error) {
      console.error('Erro ao carregar geometria auxiliar:', error);
    }
  }

  
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

  
  private updateHelperPlots(): void {
    if (!this.helperPlotsSource || !this.map) {
      return;
    }

    
    this.helperPlotsSource.clear();

    
    if (!this.helperPlots || this.helperPlots.length === 0) {
      return;
    }

    
    const defaultColors = [
      'rgba(239, 68, 68, 0.3)',   
      'rgba(249, 115, 22, 0.3)',  
      'rgba(234, 179, 8, 0.3)',   
      'rgba(34, 197, 94, 0.3)',   
      'rgba(59, 130, 246, 0.3)',  
      'rgba(168, 85, 247, 0.3)',  
      'rgba(236, 72, 153, 0.3)',  
      'rgba(20, 184, 166, 0.3)',  
    ];

    try {
      this.helperPlots.forEach((plot, index) => {
        const coordinates = this.parseGeometry(plot.geometry);
        
        if (coordinates.length > 0) {
          const polygon = new Polygon([coordinates.map(coord => fromLonLat(coord))]);
          const feature = new Feature({ geometry: polygon });
          
          
          const fillColor = plot.color || defaultColors[index % defaultColors.length];
          const strokeColor = this.rgbaToRgb(fillColor, 0.8);
          
          
          feature.setStyle(new Style({
            fill: new Fill({
              color: fillColor
            }),
            stroke: new Stroke({
              color: strokeColor,
              width: 2
            }),
            text: new Text({
              text: plot.label,
              font: 'bold 12px sans-serif',
              fill: new Fill({
                color: '#333'
              }),
              stroke: new Stroke({
                color: '#fff',
                width: 3
              }),
              textAlign: 'center',
              textBaseline: 'middle'
            })
          }));
          
          this.helperPlotsSource.addFeature(feature);
        }
      });

      
      if (!this.helperPlotsSnap && this.helperPlotsSource.getFeatures().length > 0) {
        this.helperPlotsSnap = new Snap({
          source: this.helperPlotsSource
        });
        this.map.addInteraction(this.helperPlotsSnap);
      } else if (this.helperPlotsSnap && this.helperPlotsSource.getFeatures().length > 0) {
        
        this.map.removeInteraction(this.helperPlotsSnap);
        this.map.addInteraction(this.helperPlotsSnap);
      }
    } catch (error) {
      console.error('Erro ao carregar helper plots:', error);
    }
  }

  
  private rgbaToRgb(rgba: string, opacity: number): string {
    const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${opacity})`;
    }
    return rgba;
  }

  initializeMap(): void {
    if (!this.mapContainer) return;

    
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
          lineDash: [5, 5] 
        })
      }),
      zIndex: 1, 
      renderBuffer: 4096 
    });

    
    this.helperPlotsSource = new VectorSource();
    
    this.helperPlotsLayer = new VectorLayer({
      source: this.helperPlotsSource,
      zIndex: 1.5, 
      renderBuffer: 4096 
    });

    
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
      zIndex: 2,
      renderBuffer: 4096
    });

    
    this.map = new Map({
      target: this.mapContainer.nativeElement,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        this.helperVectorLayer,
        this.helperPlotsLayer,
        this.vectorLayer
      ],
      view: new View({
        center: fromLonLat([this.centerLon, this.centerLat]),
        zoom: this.initialZoom,
      })
    });

    
    if (this.helperGeometry) {
      this.updateHelperGeometry();
    }

    
    if (this.helperPlots && this.helperPlots.length > 0) {
      this.updateHelperPlots();
    }

    
    this.map.on('pointermove', (evt: any) => {
      if (this.disabled || this.isDrawingActive) return;
      
      const mapElement = this.map!.getTargetElement() as HTMLElement;
      if (!mapElement || !this.hasDrawnPolygon) return;

      if (this.isModifying) {
        mapElement.style.cursor = 'grabbing';
        return;
      }

      const pixel = this.map!.getEventPixel(evt.originalEvent);
      const hit = this.map!.hasFeatureAtPixel(pixel);
      mapElement.style.cursor = hit ? 'grab' : 'default';
    });

    
    this.initializeModifyAndSnap();
  }

  initializeModifyAndSnap(): void {
    if (!this.map || this.disabled) return;

    
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
        
        if (this.disabled || this.isDrawingActive) return;
      
        const mapElement = this.map!.getTargetElement() as HTMLElement;
        if (!mapElement || !this.hasDrawnPolygon) return;

        
        if (this.isModifying) {
          mapElement.style.cursor = 'grabbing';
          return;
        }

        
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

    
    this.snap = new Snap({
      source: this.vectorSource
    });

    
    if (this.helperVectorSource) {
      this.helperSnap = new Snap({
        source: this.helperVectorSource
      });
      this.map.addInteraction(this.helperSnap);
    }

    
    if (this.helperPlotsSource && this.helperPlotsSource.getFeatures().length > 0) {
      this.helperPlotsSnap = new Snap({
        source: this.helperPlotsSource
      });
      this.map.addInteraction(this.helperPlotsSnap);
    }

    
    this.map.addInteraction(this.modify);
    this.map.addInteraction(this.snap);
  }

  
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
      
      
      
      if (this.snap) {
        this.map.removeInteraction(this.snap);
        this.map.addInteraction(this.snap);
      }
      
      
      if (this.helperSnap) {
        this.map.removeInteraction(this.helperSnap);
        this.map.addInteraction(this.helperSnap);
      }

      
      if (this.helperPlotsSnap) {
        this.map.removeInteraction(this.helperPlotsSnap);
        this.map.addInteraction(this.helperPlotsSnap);
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

    
    this.draw = new Draw({
      source: this.vectorSource,
      type: 'Polygon',
      style: new Style({
        fill: new Fill({
          color: 'rgba(59, 130, 246, 0.1)'
        }),
        stroke: new Stroke({
          color: 'rgba(59, 130, 246, 0.7)',
          lineDash: [10, 10],
          width: 2
        }),
        image: new CircleStyle({
          radius: 5,
          fill: new Fill({
            color: 'rgba(59, 130, 246, 0.7)'
          })
        })
      })
    });

    
    this.draw.on('drawstart', () => {
      this.vectorSource.clear();
      this.hasDrawnPolygon = false;
      this.drawStart.emit();
    });

    
    this.draw.on('drawend', () => {
      this.hasDrawnPolygon = true;
      
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

        
        this.zoomToPolygon();

        
        this.ensureSnapsActive();
      }
    } catch (error) {
      console.error('Erro ao carregar geometria:', error);
    }
  }

  
  private ensureSnapsActive(): void {
    if (!this.map) return;

    
    if (this.snap) {
      this.map.removeInteraction(this.snap);
      this.map.addInteraction(this.snap);
    }

    
    if (this.helperSnap) {
      this.map.removeInteraction(this.helperSnap);
      this.map.addInteraction(this.helperSnap);
    }

    
    if (this.helperPlotsSnap) {
      this.map.removeInteraction(this.helperPlotsSnap);
      this.map.addInteraction(this.helperPlotsSnap);
    }
  }

  
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
    
    if (geometry.startsWith('((') && geometry.endsWith('))')) {
      const cleanedGeometry = geometry.slice(2, -2);
      return cleanedGeometry.split('),(').map(pair => {
        const [lon, lat] = pair.split(',').map(Number);
        return [lon, lat] as [number, number];
      });
    }

    
    try {
      const geojson = JSON.parse(geometry);
      if (geojson.type === 'Polygon' && geojson.coordinates) {
        return geojson.coordinates[0] as [number, number][];
      }
    } catch (e) {
      
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

    
    const lonLatCoords = coordinates.map((coord: Coordinate) => {
      const [lon, lat] = toLonLat(coord);
      return `(${lon},${lat})`;
    });

    
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

  
  importGeometry(content: string, filename: string): void {
    try {
      let features: Feature[] = [];
      const extension = filename.split('.').pop()?.toLowerCase();

      
      if (extension === 'geojson' || extension === 'json') {
        features = this.importGeoJSON(content);
      } else if (extension === 'kml') {
        features = this.importKML(content);
      } else if (extension === 'wkt' || extension === 'txt') {
        features = this.importWKT(content);
      } else {
        
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

  
  private autoDetectFormat(content: string): Feature[] {
    const trimmed = content.trim();

    
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return this.importGeoJSON(trimmed);
      } catch (e) {
        
      }
    }

    
    if (trimmed.startsWith('<')) {
      try {
        return this.importKML(trimmed);
      } catch (e) {
        
      }
    }

    
    if (trimmed.toUpperCase().startsWith('POLYGON')) {
      try {
        return this.importWKT(trimmed);
      } catch (e) {
        
      }
    }

    throw new Error('Formato não reconhecido. Use GeoJSON, KML ou WKT.');
  }

  
  private filterPolygons(features: Feature[]): Feature[] {
    const polygons: Feature[] = [];

    for (const feature of features) {
      const geometry = feature.getGeometry();
      
      if (!geometry) continue;

      const geomType = geometry.getType();

      if (geomType === 'Polygon') {
        
        polygons.push(feature);
      } else if (geomType === 'MultiPolygon') {
        
        const multiPolygon = geometry as MultiPolygon;
        const polygonGeometries = multiPolygon.getPolygons();
        
        
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

  
  private loadFeaturesIntoMap(features: Feature[]): void {
    if (features.length === 0) {
      throw new Error('Nenhum polígono encontrado no arquivo');
    }

    
    this.vectorSource.clear();
    this.vectorSource.addFeature(features[0]);
    this.hasDrawnPolygon = true;

    
    this.zoomToPolygon();

    
    const geometry = this.getGeometryFromMap();
    if (geometry) {
      this.onChange(geometry);
      this.onTouched();
      this.geometryChange.emit(geometry);
    }

    
    if (features.length > 1) {
      this.messageService.add({
        severity: 'info',
        summary: 'Múltiplas Geometrias',
        detail: `Apenas a primeira geometria foi importada (${features.length} encontradas)`,
        life: 4000
      });
    }
  }

  

  
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
