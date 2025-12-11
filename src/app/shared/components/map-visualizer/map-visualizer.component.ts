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
  EventEmitter
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { MenuModule } from 'primeng/menu';
import { CheckboxModule } from 'primeng/checkbox';

// OpenLayers
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Cluster from 'ol/source/Cluster';
import { fromLonLat, toLonLat } from 'ol/proj';
import { Feature } from 'ol';
import { Polygon, Point } from 'ol/geom';
import { Fill, Stroke, Style, Text, Circle, Icon } from 'ol/style';

interface GeometryItem {
  geometry: string;
  label?: string;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
}

export interface MapMarker {
  id?: string | number;
  latitude: number;
  longitude: number;
  type?: string;
  color?: string;
  icon?: string;
  label?: string;
  data?: any;
  onClick?: (marker: MapMarker) => void;
  onHover?: (marker: MapMarker) => void;
}

@Component({
  selector: 'app-map-visualizer',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, TooltipModule, MenuModule, CheckboxModule],
  templateUrl: './map-visualizer.component.html',
  styleUrls: ['./map-visualizer.component.scss']
})
export class MapVisualizerComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef<HTMLDivElement>;

  // Inputs para customização
  @Input() height: string = '600px';
  @Input() centerLat: number = -15.7801;  // Brasília
  @Input() centerLon: number = -47.9292;  // Brasília
  @Input() initialZoom: number = 12;
  @Input() maxZoom: number = 18;
  
  // Geometrias para visualizar
  @Input() geometries: GeometryItem[] = [];
  
  // Marcadores para visualizar (pontos no mapa)
  @Input() markers: MapMarker[] = [];
  
  // Habilitar clustering de marcadores (agrupamento inteligente)
  @Input() enableClustering: boolean = false;
  
  // Distância mínima para clustering (em pixels)
  @Input() clusterDistance: number = 50;
  
  // Habilitar clique no mapa para selecionar coordenadas
  @Input() enableMapClick: boolean = false;
  
  // Index da geometria destacada
  @Input() highlightedIndex?: number;
  
  // Evento emitido quando o mapa é clicado (retorna lat/lon)
  @Output() mapClick = new EventEmitter<{ latitude: number; longitude: number }>();

  // Estado interno
  map?: Map;
  vectorSource!: VectorSource;
  vectorLayer!: VectorLayer<VectorSource>;
  markersSource!: VectorSource;
  markersLayer!: VectorLayer<VectorSource>;
  clusterSource?: Cluster; // Source para clustering
  private hasInitialFit = false; // Flag para controlar o fit inicial
  
  // Controle de visibilidade de labels
  showAreaLabels = true;
  showPlotLabels = true;
  
  // Controle de camada base do mapa
  baseLayerType: 'streets' | 'satellite' | 'terrain' | 'topo' = 'streets';
  private baseLayer!: TileLayer<any>;
  
  // Controle de visibilidade individual de cada geometria (index -> visible)
  geometryVisibility: { [key: number]: boolean } = {};
  
  // Cache das features para re-renderização
  private featuresCache: Array<{ feature: Feature; item: GeometryItem; isArea: boolean; index: number }> = [];
  
  // Índice anterior destacado (para detectar mudanças)
  private previousHighlightedIndex?: number;
  
  // Feature de marcador com hover
  private hoveredMarkerFeature?: Feature;

  constructor() {}

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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['geometries'] && !changes['geometries'].firstChange) {
      this.updateGeometries();
    }
    
    if (changes['markers'] && !changes['markers'].firstChange) {
      this.updateMarkers();
    }
    
    if (changes['highlightedIndex']) {
      const newIndex = changes['highlightedIndex'].currentValue;
      if (newIndex !== this.previousHighlightedIndex) {
        this.previousHighlightedIndex = newIndex;
        this.updateFeaturesStyles();
        
        // Se há um índice destacado, navegar até ele
        if (newIndex !== undefined && newIndex !== null) {
          this.flyToGeometry(newIndex);
        }
      }
    }
  }

  initializeMap(): void {
    if (!this.mapContainer) return;

    // Criar source e layer para vetores (geometrias/polígonos)
    this.vectorSource = new VectorSource();
    
    this.vectorLayer = new VectorLayer({
      source: this.vectorSource,
      renderBuffer: 4096
    });
    
    // Criar source para marcadores (pontos)
    this.markersSource = new VectorSource();
    
    // Se clustering está habilitado, criar cluster source
    if (this.enableClustering) {
      this.clusterSource = new Cluster({
        distance: this.clusterDistance,
        source: this.markersSource,
        minDistance: 20 // Distância mínima entre clusters
      });
      
      this.markersLayer = new VectorLayer({
        source: this.clusterSource,
        style: (feature) => this.getClusterStyle(feature as any),
        zIndex: 100
      });
    } else {
      // Modo tradicional sem clustering
      this.markersLayer = new VectorLayer({
        source: this.markersSource,
        zIndex: 100
      });
    }

    // Criar camada base
    this.baseLayer = this.createBaseLayer(this.baseLayerType);

    // Criar mapa
    this.map = new Map({
      target: this.mapContainer.nativeElement,
      layers: [
        this.baseLayer,
        this.vectorLayer,
        this.markersLayer
      ],
      view: new View({
        center: fromLonLat([this.centerLon, this.centerLat]),
        zoom: this.initialZoom,
      }),
      controls: [] // Sem controles por padrão
    });
    
    // Adicionar evento de clique no mapa para marcadores
    this.map.on('click', (event) => {
      let clickedMarker = false;
      
      this.map!.forEachFeatureAtPixel(event.pixel, (feature) => {
        // Se está usando clustering, a feature pode ser um cluster
        if (this.enableClustering && this.clusterSource) {
          const features = feature.get('features');
          if (features && features.length > 1) {
            // Verificar se todos os pontos estão na mesma posição (cluster indivisível)
            const firstFeature = features[0];
            const firstCoords = firstFeature.getGeometry()?.getCoordinates();
            
            const allSamePosition = features.every((f: Feature) => {
              const coords = (f.getGeometry() as any)?.getCoordinates();
              return coords && firstCoords && 
                     Math.abs(coords[0] - firstCoords[0]) < 0.0001 && 
                     Math.abs(coords[1] - firstCoords[1]) < 0.0001;
            });
            
            if (allSamePosition) {
              // Cluster indivisível - chamar onClick do primeiro marcador
              // O componente pai irá detectar múltiplos na mesma posição
              const markerData = firstFeature.get('markerData');
              if (markerData && markerData.onClick) {
                markerData.onClick(markerData, event);
                clickedMarker = true;
                return true;
              }
            } else {
              // É um cluster divisível - fazer zoom no cluster
              const extent = feature.getGeometry()!.getExtent();
              this.map!.getView().fit(extent, {
                padding: [100, 100, 100, 100],
                duration: 500,
                maxZoom: this.map!.getView().getZoom()! + 2
              });
              clickedMarker = true;
              return true; // Parar iteração
            }
          } else if (features && features.length === 1) {
            // É um cluster com um único ponto - tratar como marcador normal
            const markerData = features[0].get('markerData');
            if (markerData && markerData.onClick) {
              markerData.onClick(markerData, event);
              clickedMarker = true;
              return true;
            }
          }
        } else {
          // Modo tradicional sem clustering
          const markerData = feature.get('markerData');
          if (markerData && markerData.onClick) {
            markerData.onClick(markerData, event);
            clickedMarker = true;
            return true;
          }
        }
        return false;
      });
      
      // Se não clicou em um marcador e o clique no mapa está habilitado, emitir coordenadas
      if (!clickedMarker && this.enableMapClick) {
        const coordinates = this.map!.getCoordinateFromPixel(event.pixel);
        const [lon, lat] = toLonLat(coordinates);
        this.mapClick.emit({ latitude: lat, longitude: lon });
      }
    });
    
    // Adicionar evento de hover nos marcadores
    this.map.on('pointermove', (event) => {
      const pixel = this.map!.getEventPixel(event.originalEvent);
      let foundMarker = false;
      
      this.map!.forEachFeatureAtPixel(pixel, (feature) => {
        if (this.enableClustering && this.clusterSource) {
          const features = feature.get('features');
          if (features) {
            foundMarker = true;
            // Para clusters, apenas mudar cursor
            return true;
          }
        } else {
          const markerData = feature.get('markerData');
          if (markerData) {
            foundMarker = true;
            
            // Se mudou de marcador, atualizar hover
            if (this.hoveredMarkerFeature !== feature) {
              // Remover hover do anterior
              if (this.hoveredMarkerFeature) {
                const prevData = this.hoveredMarkerFeature.get('markerData');
                this.applyMarkerStyle(this.hoveredMarkerFeature, prevData, false);
              }
              
              // Aplicar hover no novo
              this.hoveredMarkerFeature = feature as Feature;
              this.applyMarkerStyle(feature as Feature, markerData, true);
              
              // Chamar callback de hover
              if (markerData.onHover) {
                markerData.onHover(markerData);
              }
            }
            return true;
          }
        }
        return false;
      });
      
      // Se não encontrou marcador, remover hover
      if (!foundMarker && this.hoveredMarkerFeature) {
        const prevData = this.hoveredMarkerFeature.get('markerData');
        this.applyMarkerStyle(this.hoveredMarkerFeature, prevData, false);
        this.hoveredMarkerFeature = undefined;
      }
      
      // Atualizar cursor - crosshair se enableMapClick está ativo e não está sobre marcador
      if (this.enableMapClick && !foundMarker) {
        this.map!.getTargetElement().style.cursor = 'crosshair';
      } else {
        this.map!.getTargetElement().style.cursor = foundMarker ? 'pointer' : '';
      }
    });

    // Carregar geometrias se fornecidas
    if (this.geometries && this.geometries.length > 0) {
      this.updateGeometries();
    }
    
    // Carregar marcadores se fornecidos
    if (this.markers && this.markers.length > 0) {
      this.updateMarkers();
    }
  }

  private updateGeometries(): void {
    if (!this.vectorSource || !this.map) {
      return;
    }

    // Limpar geometrias anteriores
    this.vectorSource.clear();
    this.featuresCache = [];

    if (!this.geometries || this.geometries.length === 0) {
      return;
    }

    try {
      this.geometries.forEach((item, index) => {
        const coordinates = this.parseGeometry(item.geometry);
        
        if (coordinates.length > 0) {
          const polygon = new Polygon([coordinates.map(coord => fromLonLat(coord))]);
          const feature = new Feature({ geometry: polygon });
          
          // Identificar se é área (primeiro elemento) ou plot
          const isArea = index === 0;
          
          // Inicializar visibilidade (default: true)
          if (this.geometryVisibility[index] === undefined) {
            this.geometryVisibility[index] = true;
          }
          
          // Aplicar estilo
          this.applyFeatureStyle(feature, item, isArea, index);
          
          // Cachear feature
          this.featuresCache.push({ feature, item, isArea, index });
          
          this.vectorSource.addFeature(feature);
        }
      });

      // Ajustar zoom para mostrar todas as geometrias (apenas na primeira vez)
      if (!this.hasInitialFit) {
        this.fitToGeometries();
        this.hasInitialFit = true;
      }
    } catch (error) {
      console.error('Erro ao carregar geometrias:', error);
    }
  }

  private applyFeatureStyle(feature: Feature, item: GeometryItem, isArea: boolean, index: number): void {
    // Verificar se a geometria individual está visível
    const isVisible = this.geometryVisibility[index] !== false;
    
    if (!isVisible) {
      // Se a layer está oculta, aplicar estilo invisível
      feature.setStyle(new Style({}));
      return;
    }

    // Verificar se esta geometria está destacada
    const isHighlighted = this.highlightedIndex === index;
    
    // Ajustar cores se estiver destacado
    let fillColor = item.fillColor || 'rgba(16, 185, 129, 0.2)';
    let strokeColor = item.strokeColor || 'rgb(16, 185, 129)';
    let strokeWidth = item.strokeWidth || 2;
    
    if (isHighlighted) {
      // Aumentar opacidade e largura da borda para destacar
      fillColor = this.increaseFillOpacity(fillColor);
      strokeWidth = strokeWidth + 2;
    }

    const style = new Style({
      fill: new Fill({
        color: fillColor
      }),
      stroke: new Stroke({
        color: strokeColor,
        width: strokeWidth
      }),
      zIndex: isHighlighted ? 100 : 1 // Geometria destacada fica por cima
    });

    // Adicionar label se fornecido e se a camada está visível
    const shouldShowLabel = item.label && (
      (isArea && this.showAreaLabels) || 
      (!isArea && this.showPlotLabels)
    );

    if (shouldShowLabel) {
      style.setText(new Text({
        text: item.label,
        font: isHighlighted ? 'bold 14px sans-serif' : 'bold 12px sans-serif',
        fill: new Fill({
          color: '#333'
        }),
        stroke: new Stroke({
          color: '#fff',
          width: isHighlighted ? 4 : 3
        }),
        textAlign: 'center',
        textBaseline: 'middle'
      }));
    }

    feature.setStyle(style);
  }

  toggleAreaLabels(): void {
    this.showAreaLabels = !this.showAreaLabels;
    this.updateFeaturesStyles();
  }

  togglePlotLabels(): void {
    this.showPlotLabels = !this.showPlotLabels;
    this.updateFeaturesStyles();
  }

  updateFeaturesStyles(): void {
    this.featuresCache.forEach(({ feature, item, isArea, index }) => {
      this.applyFeatureStyle(feature, item, isArea, index);
    });
  }

  toggleGeometryVisibility(index: number): void {
    this.geometryVisibility[index] = !this.geometryVisibility[index];
    this.updateFeaturesStyles();
  }

  isGeometryVisible(index: number): boolean {
    return this.geometryVisibility[index] !== false;
  }
  
  /**
   * Cria uma camada base baseada no tipo especificado
   */
  private createBaseLayer(type: 'streets' | 'satellite' | 'terrain' | 'topo'): TileLayer<any> {
    let source;
    
    switch (type) {
      case 'satellite':
        source = new XYZ({
          url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
          attributions: '© Google',
          maxZoom: 20
        });
        break;
        
      case 'terrain':
        // OpenTopoMap (Relevo/Terreno)
        source = new OSM({
          url: 'https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png',
          attributions: 'Map data: © OpenStreetMap contributors, SRTM'
        });
        break;
        
      case 'topo':
        // Esri World Topo (Topográfico)
        source = new OSM({
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
          attributions: '© Esri, HERE, Garmin, FAO, NOAA, USGS'
        });
        break;
        
      case 'streets':
      default:
        // OpenStreetMap padrão (Ruas)
        source = new OSM();
        break;
    }
    
    return new TileLayer({ source });
  }
  
  /**
   * Troca a camada base do mapa
   */
  changeBaseLayer(type: 'streets' | 'satellite' | 'terrain' | 'topo'): void {
    if (!this.map) return;
    
    this.baseLayerType = type;
    const newBaseLayer = this.createBaseLayer(type);
    
    // Substituir a camada base (sempre é a primeira camada)
    const layers = this.map.getLayers();
    layers.removeAt(0);
    layers.insertAt(0, newBaseLayer);
    
    this.baseLayer = newBaseLayer;
  }


  highlightAndFlyTo(index: number): void {
    this.highlightedIndex = index;
    this.updateFeaturesStyles();
    this.flyToGeometry(index);
  }

  clearHighlight(): void {
    this.highlightedIndex = undefined;
    this.updateFeaturesStyles();
  }

  private fitToGeometries(): void {
    if (!this.map || !this.vectorSource) return;
    
    const features = this.vectorSource.getFeatures();
    if (features.length === 0) return;
    
    const extent = this.vectorSource.getExtent();
    this.map.getView().fit(extent, {
      padding: [50, 50, 50, 50],
      maxZoom: this.maxZoom,
      duration: 500
    });
  }

  private parseGeometry(geometry: string): [number, number][] {
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

  private increaseFillOpacity(color: string): string {
    // Aumentar a opacidade de uma cor rgba
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/);
    if (match) {
      const [, r, g, b, a] = match;
      const opacity = a ? parseFloat(a) : 1;
      // Aumentar opacidade em 50%
      const newOpacity = Math.min(opacity + 0.3, 0.9);
      return `rgba(${r}, ${g}, ${b}, ${newOpacity})`;
    }
    return color;
  }

  flyToGeometry(index: number): void {
    if (!this.map) return;
    
    const cached = this.featuresCache.find(c => c.index === index);
    if (!cached) return;
    
    const geometry = cached.feature.getGeometry();
    if (!geometry) return;
    
    const extent = geometry.getExtent();
    
    // Fazer fit completo da geometria com padding generoso para visualização total
    this.map.getView().fit(extent, {
      padding: [150, 150, 150, 150],
      duration: 800,
      maxZoom: 18, // Permite zoom maior para plots pequenos
      minResolution: undefined // Remove limite de zoom out
    });
  }
  
  private updateMarkers(): void {
    if (!this.markersSource || !this.map) {
      return;
    }

    // Limpar marcadores anteriores
    this.markersSource.clear();

    if (!this.markers || this.markers.length === 0) {
      return;
    }

    try {
      this.markers.forEach((marker) => {
        const point = new Point(fromLonLat([marker.longitude, marker.latitude]));
        const feature = new Feature({ geometry: point });
        
        // Armazenar os dados do marcador na feature para callbacks
        feature.set('markerData', marker);
        
        // Aplicar estilo ao marcador (sem hover inicialmente)
        this.applyMarkerStyle(feature, marker, false);
        
        this.markersSource.addFeature(feature);
      });
      
      // Ajustar zoom para mostrar todos os marcadores
      this.fitToMarkers();
    } catch (error) {
      console.error('Erro ao carregar marcadores:', error);
    }
  }
  
  /**
   * Ajusta o zoom do mapa para exibir todos os marcadores
   */
  public fitToMarkers(): void {
    if (!this.map || !this.markersSource) return;
    
    const features = this.markersSource.getFeatures();
    if (features.length === 0) return;
    
    const extent = this.markersSource.getExtent();
    
    // Se há apenas um marcador, fazer zoom nele com um nível fixo
    if (features.length === 1) {
      const coordinate = features[0].getGeometry()!.getExtent();
      this.map.getView().animate({
        center: [(coordinate[0] + coordinate[2]) / 2, (coordinate[1] + coordinate[3]) / 2],
        zoom: 15,
        duration: 500
      });
    } else {
      // Múltiplos marcadores - fazer fit no extent
      this.map.getView().fit(extent, {
        padding: [80, 80, 80, 80],
        maxZoom: 16,
        duration: 500
      });
    }
  }
  
  private applyMarkerStyle(feature: Feature, marker: MapMarker, isHovered: boolean = false): void {
    const color = marker.color || '#ff0000';
    const label = marker.label || '';
    
    // Estilo do marcador - maior e mais destacado
    const radius = isHovered ? 10 : 7;
    const strokeWidth = isHovered ? 3 : 2.5;
    
    const style = new Style({
      image: new Circle({
        radius: radius,
        fill: new Fill({
          color: color
        }),
        stroke: new Stroke({
          color: '#ffffff',
          width: strokeWidth
        })
      }),
      // Mostrar label apenas no hover
      text: (isHovered && label) ? new Text({
        text: label,
        offsetY: -20,
        font: 'bold 13px sans-serif',
        fill: new Fill({
          color: '#1f2937'
        }),
        stroke: new Stroke({
          color: '#ffffff',
          width: 4
        }),
        backgroundFill: new Fill({
          color: 'rgba(255, 255, 255, 0.9)'
        }),
        padding: [3, 6, 2, 6]
      }) : undefined
    });
    
    feature.setStyle(style);
  }
  
  /**
   * Cria o estilo para clusters de marcadores
   * Exibe um círculo maior com o número de pontos agrupados
   */
  private getClusterStyle(feature: Feature): Style {
    const features = feature.get('features');
    const size = features ? features.length : 0;
    
    if (size === 1) {
      // Apenas um marcador - usar estilo normal
      const marker = features[0].get('markerData');
      if (marker) {
        const color = marker.color || '#ff0000';
        return new Style({
          image: new Circle({
            radius: 7,
            fill: new Fill({
              color: color
            }),
            stroke: new Stroke({
              color: '#ffffff',
              width: 2.5
            })
          })
        });
      }
    }
    
    // Cluster com múltiplos marcadores
    // Calcular raio baseado na quantidade (até um limite)
    let radius = 15;
    let fontSize = '13px';
    
    if (size > 100) {
      radius = 28;
      fontSize = '16px';
    } else if (size > 50) {
      radius = 24;
      fontSize = '15px';
    } else if (size > 20) {
      radius = 20;
      fontSize = '14px';
    } else if (size > 10) {
      radius = 17;
      fontSize = '13px';
    }
    
    // Cores gradientes baseadas na densidade
    let fillColor = 'rgba(59, 130, 246, 0.7)'; // Azul claro
    let strokeColor = 'rgb(37, 99, 235)'; // Azul
    
    if (size > 100) {
      fillColor = 'rgba(239, 68, 68, 0.8)'; // Vermelho
      strokeColor = 'rgb(220, 38, 38)';
    } else if (size > 50) {
      fillColor = 'rgba(249, 115, 22, 0.8)'; // Laranja
      strokeColor = 'rgb(234, 88, 12)';
    } else if (size > 20) {
      fillColor = 'rgba(234, 179, 8, 0.8)'; // Amarelo
      strokeColor = 'rgb(202, 138, 4)';
    } else if (size > 10) {
      fillColor = 'rgba(34, 197, 94, 0.8)'; // Verde
      strokeColor = 'rgb(22, 163, 74)';
    }
    
    return new Style({
      image: new Circle({
        radius: radius,
        fill: new Fill({
          color: fillColor
        }),
        stroke: new Stroke({
          color: strokeColor,
          width: 3
        })
      }),
      text: new Text({
        text: size.toString(),
        font: `bold ${fontSize} sans-serif`,
        fill: new Fill({
          color: '#ffffff'
        }),
        stroke: new Stroke({
          color: strokeColor,
          width: 2
        }),
        textAlign: 'center',
        textBaseline: 'middle'
      })
    });
  }

  updateMapSize(): void {
    if (this.map) {
      this.map.updateSize();
    }
  }
}
