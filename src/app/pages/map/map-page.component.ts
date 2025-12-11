import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG
import { CardModule } from 'primeng/card';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { DrawerModule } from 'primeng/drawer';
import { Popover } from 'primeng/popover';
import { DividerModule } from 'primeng/divider';
import { TagModule } from 'primeng/tag';
import { AvatarModule } from 'primeng/avatar';

// Services
import { SpecimenObjectService } from '@/core/services/specimen-object.service';
import { SpeciesTaxonomyService } from '@/core/services';
import { CollectionAreaService } from '@/core/services';
import { UserService } from '@/core/services';

// Models
import { SpecimenObject } from '@/core/models/specimen/specimen-object';
import { SpeciesTaxonomy } from '@/core/models/species/species-taxonomy';
import { CollectionArea } from '@/core/models/collection/collection-area';
import { User } from '@/core/models/user/user';

// Components
import { MapVisualizerComponent, MapMarker } from '@/shared/components/map-visualizer';

@Component({
  selector: 'app-map-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    SelectModule,
    ButtonModule,
    ProgressSpinnerModule,
    TooltipModule,
    MapVisualizerComponent,
    DialogModule,
    DrawerModule,
    Popover,
    DividerModule,
    TagModule,
    AvatarModule
  ],
  templateUrl: './map-page.component.html',
  styleUrls: ['./map-page.component.scss']
})
export class MapPageComponent implements OnInit {
  @ViewChild(MapVisualizerComponent) mapVisualizer?: MapVisualizerComponent;
  @ViewChild('clusterPopover') clusterPopover?: Popover;
  
  specimens: SpecimenObject[] = [];
  allSpecimens: SpecimenObject[] = [];
  markers: MapMarker[] = [];
  
  // Filtros
  selectedSpecies?: SpeciesTaxonomy;
  selectedArea?: CollectionArea;
  selectedObserver?: User;
  
  // Listas completas (sem filtro)
  allSpeciesList: SpeciesTaxonomy[] = [];
  allAreasList: CollectionArea[] = [];
  allObserversList: User[] = [];
  
  // Listas filtradas para dropdowns
  speciesList: SpeciesTaxonomy[] = [];
  areasList: CollectionArea[] = [];
  observersList: User[] = [];
  
  // Estado
  loading = false;
  initialLoad = true;
  
  // Sidebar de detalhes
  showSpecimenDetails = false;
  selectedSpecimen?: SpecimenObject;
  
  // Popover de seleção (para clusters na mesma posição)
  clusterSpecimens: SpecimenObject[] = [];
  clusterPopoverEvent?: MouseEvent;
  popoverAnchor?: HTMLElement;
  
  // Centro do mapa (Brasília)
  centerLat = -15.7801;
  centerLon = -47.9292;
  initialZoom = 5;

  constructor(
    private specimenService: SpecimenObjectService,
    private speciesService: SpeciesTaxonomyService,
    private areaService: CollectionAreaService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.loading = true;
    
    // Carregar todos os espécimes primeiro
    this.specimenService.findWithFilters().subscribe({
      next: (data: SpecimenObject[]) => {
        this.allSpecimens = data;
        this.specimens = data;
        this.updateMarkers();
        this.updateMapCenter();
        this.loading = false;
        this.initialLoad = false;
        
        // Depois carregar as listas de filtros
        this.loadAllFilters();
        this.updateFilteredLists();
      },
      error: (error: any) => {
        console.error('Erro ao carregar espécimes:', error);
        this.loading = false;
        this.initialLoad = false;
      }
    });
  }

  loadAllFilters(): void {
    // Carregar todas as espécies
    this.speciesService.getSpeciesTaxonomies(0, 1000).subscribe({
      next: (response: any) => {
        this.allSpeciesList = response.content;
        this.updateFilteredLists();
      },
      error: (error: any) => console.error('Erro ao carregar espécies:', error)
    });

    // Carregar todas as áreas
    this.areaService.search(0, 1000).subscribe({
      next: (response: any) => {
        this.allAreasList = response.content;
        this.updateFilteredLists();
      },
      error: (error: any) => console.error('Erro ao carregar áreas:', error)
    });

    // Carregar todos os observadores
    this.userService.search(0, 1000).subscribe({
      next: (response: any) => {
        this.allObserversList = response.content;
        this.updateFilteredLists();
      },
      error: (error: any) => console.error('Erro ao carregar observadores:', error)
    });
  }

  updateFilteredLists(): void {
    // Filtrar espécies baseado nos espécimes atuais
    const availableSpeciesIds = new Set(this.specimens.map(s => s.speciesId));
    this.speciesList = this.allSpeciesList.filter(species => 
      species.id && availableSpeciesIds.has(species.id)
    );

    // Filtrar áreas baseado nos espécimes atuais
    const availableAreaIds = new Set(this.specimens.map(s => s.areaId).filter(id => id !== undefined));
    this.areasList = this.allAreasList.filter(area => 
      area.id && availableAreaIds.has(area.id)
    );

    // Filtrar observadores baseado nos espécimes atuais
    const availableObserverIds = new Set(this.specimens.map(s => s.observerId));
    this.observersList = this.allObserversList.filter(observer => 
      observer.id && availableObserverIds.has(observer.id)
    );
  }

  loadSpecimens(): void {
    this.loading = true;
    
    const speciesId = this.selectedSpecies?.id;
    const areaId = this.selectedArea?.id;
    const observerId = this.selectedObserver?.id;

    this.specimenService.findWithFilters(speciesId, areaId, observerId).subscribe({
      next: (data: SpecimenObject[]) => {
        this.specimens = data;
        this.updateMarkers();
        this.updateMapCenter();
        this.updateFilteredLists();
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Erro ao carregar espécimes:', error);
        this.loading = false;
      }
    });
  }

  onFilterChange(): void {
    this.loadSpecimens();
  }

  updateMarkers(): void {
    this.markers = this.specimens.map(specimen => ({
      id: specimen.id,
      latitude: specimen.latitude,
      longitude: specimen.longitude,
      label: specimen.speciesScientificName || 'Espécie não identificada',
      type: 'specimen',
      color: this.getMarkerColor(specimen.speciesId),
      data: specimen,
      onClick: (marker: MapMarker, event?: any) => this.handleMarkerClick(marker, event)
    }));
    
    // Aguardar o Angular atualizar a view e depois ajustar o zoom
    setTimeout(() => {
      if (this.mapVisualizer) {
        this.mapVisualizer.fitToMarkers();
      }
    }, 300);
  }

  updateMapCenter(): void {
    // Não precisa mais calcular centro manualmente, o fitToMarkers faz isso
  }

  getMarkerColor(speciesId: number): string {
    // Gerar cor baseada no ID da espécie
    const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
    return colors[speciesId % colors.length];
  }

  applyFilters(): void {
    this.loadSpecimens();
  }

  clearFilters(): void {
    this.selectedSpecies = undefined;
    this.selectedArea = undefined;
    this.selectedObserver = undefined;
    this.specimens = this.allSpecimens;
    this.updateMarkers();
    this.updateFilteredLists();
  }

  handleMarkerClick(marker: MapMarker, event?: any): void {
    // Marker click handled
    // Encontrar todos os espécimes na mesma posição (cluster indivisível)
    const samePosition = this.specimens.filter(s => 
      Math.abs(s.latitude - marker.latitude) < 0.000001 && 
      Math.abs(s.longitude - marker.longitude) < 0.000001
    );

    // Número de espécimes na mesma posição: samePosition.length

    if (samePosition.length > 1) {
      // Múltiplos espécimes na mesma posição - mostrar popover de seleção
      this.clusterSpecimens = samePosition;
      
      // Extrair coordenadas do evento do OpenLayers
      setTimeout(() => {
        if (this.clusterPopover && event) {
          // Remover âncora anterior se existir
          if (this.popoverAnchor) {
            document.body.removeChild(this.popoverAnchor);
          }

          // O evento do OpenLayers tem originalEvent que é o evento DOM real
          const originalEvent = event.originalEvent;
          
          let clientX: number;
          let clientY: number;
          
          if (originalEvent && originalEvent.clientX !== undefined) {
            // Usar o evento DOM original
            clientX = originalEvent.clientX;
            clientY = originalEvent.clientY;
          } else if (event.pixel) {
            // Calcular posição a partir do pixel do evento OpenLayers
            const mapElement = event.map?.getTargetElement();
              if (mapElement) {
              const rect = mapElement.getBoundingClientRect();
              clientX = rect.left + event.pixel[0];
              clientY = rect.top + event.pixel[1];
            } else {
              // Fallback para o centro da tela
              clientX = window.innerWidth / 2;
              clientY = window.innerHeight / 2;
            }
          } else {
            // Fallback para o centro da tela
            clientX = window.innerWidth / 2;
            clientY = window.innerHeight / 2;
          }

          // Criar elemento âncora invisível na posição do clique
          this.popoverAnchor = document.createElement('div');
          this.popoverAnchor.style.position = 'fixed';
          this.popoverAnchor.style.left = `${clientX - 20}px`;
          this.popoverAnchor.style.top = `${clientY}px`;
          this.popoverAnchor.style.width = '0px';
          this.popoverAnchor.style.height = '0px';
          this.popoverAnchor.style.pointerEvents = 'none';
          this.popoverAnchor.style.zIndex = '9999';
          document.body.appendChild(this.popoverAnchor);

          
          // Mostrar popover usando o elemento âncora
          this.clusterPopover.show(null, this.popoverAnchor);
        }
      }, 0);
    } else if (samePosition.length === 1) {
      // Apenas um espécime - mostrar detalhes diretamente
      this.selectedSpecimen = samePosition[0];
      this.showSpecimenDetails = true;
    } else {
      // Fallback: usar o marker data
      this.selectedSpecimen = marker.data as SpecimenObject;
      this.showSpecimenDetails = true;
    }
  }

  selectSpecimenFromCluster(specimen: SpecimenObject): void {
    this.clusterPopover?.hide();
    
    // Limpar elemento âncora
    if (this.popoverAnchor) {
      document.body.removeChild(this.popoverAnchor);
      this.popoverAnchor = undefined;
    }
    
    this.selectedSpecimen = specimen;
    this.showSpecimenDetails = true;
  }

  closeSpecimenDetails(): void {
    this.showSpecimenDetails = false;
    this.selectedSpecimen = undefined;
  }

  resetMapView(): void {
    if (this.mapVisualizer) {
      this.mapVisualizer.fitToMarkers();
    }
  }

  formatDate(date: Date | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('pt-BR');
  }

  formatCoordinate(coord: number | undefined): string {
    if (coord === undefined) return 'N/A';
    return coord.toFixed(6);
  }

  getInitials(name: string): string {
      if (!name) return '?';
      const parts = name.split(' ');
      if (parts.length >= 2) {
          return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
  }

  getUserAvatarColor(name: string): string {
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
