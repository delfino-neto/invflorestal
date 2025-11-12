import { 
  Component, 
  OnInit, 
  AfterViewInit, 
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ElementRef, 
  ViewChild,
  Input
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
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { fromLonLat, toLonLat } from 'ol/proj';
import { Feature } from 'ol';
import { Polygon } from 'ol/geom';
import { Fill, Stroke, Style, Text } from 'ol/style';

interface GeometryItem {
  geometry: string;
  label?: string;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
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
  
  // Index da geometria destacada
  @Input() highlightedIndex?: number;

  // Estado interno
  map?: Map;
  vectorSource!: VectorSource;
  vectorLayer!: VectorLayer<VectorSource>;
  private hasInitialFit = false; // Flag para controlar o fit inicial
  
  // Controle de visibilidade de labels
  showAreaLabels = true;
  showPlotLabels = true;
  
  // Controle de visibilidade individual de cada geometria (index -> visible)
  geometryVisibility: { [key: number]: boolean } = {};
  
  // Cache das features para re-renderização
  private featuresCache: Array<{ feature: Feature; item: GeometryItem; isArea: boolean; index: number }> = [];
  
  // Índice anterior destacado (para detectar mudanças)
  private previousHighlightedIndex?: number;

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

    // Criar source e layer para vetores
    this.vectorSource = new VectorSource();
    
    this.vectorLayer = new VectorLayer({
      source: this.vectorSource,
      renderBuffer: 4096
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
        zoom: this.initialZoom,
      }),
      controls: [] // Sem controles por padrão
    });

    // Carregar geometrias se fornecidas
    if (this.geometries && this.geometries.length > 0) {
      this.updateGeometries();
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

  updateMapSize(): void {
    if (this.map) {
      this.map.updateSize();
    }
  }
}
