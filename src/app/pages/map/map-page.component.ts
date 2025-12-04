import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG
import { CardModule } from 'primeng/card';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TooltipModule } from 'primeng/tooltip';

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
    MapVisualizerComponent
  ],
  templateUrl: './map-page.component.html',
  styleUrls: ['./map-page.component.scss']
})
export class MapPageComponent implements OnInit {
  @ViewChild(MapVisualizerComponent) mapVisualizer?: MapVisualizerComponent;
  
  specimens: SpecimenObject[] = [];
  allSpecimens: SpecimenObject[] = []; // Todos os espécimes sem filtro
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
      data: specimen
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

  onMarkerClick(marker: MapMarker): void {
    const specimen = marker.data as SpecimenObject;
    console.log('Espécime clicado:', specimen);
    // Aqui você pode abrir um dialog com detalhes do espécime
  }

  resetMapView(): void {
    if (this.mapVisualizer) {
      this.mapVisualizer.fitToMarkers();
    }
  }
}
