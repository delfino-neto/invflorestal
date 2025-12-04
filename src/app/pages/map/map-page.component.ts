import { Component, OnInit } from '@angular/core';
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
  specimens: SpecimenObject[] = [];
  markers: MapMarker[] = [];
  
  // Filtros
  selectedSpecies?: SpeciesTaxonomy;
  selectedArea?: CollectionArea;
  selectedObserver?: User;
  
  // Listas para dropdowns
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
    this.loadFilters();
    this.loadSpecimens();
  }

  loadFilters(): void {
    // Carregar espécies
    this.speciesService.getSpeciesTaxonomies(0, 1000).subscribe({
      next: (response: any) => {
        this.speciesList = response.content;
      },
      error: (error: any) => console.error('Erro ao carregar espécies:', error)
    });

    // Carregar áreas
    this.areaService.search(0, 1000).subscribe({
      next: (response: any) => {
        this.areasList = response.content;
      },
      error: (error: any) => console.error('Erro ao carregar áreas:', error)
    });

    // Carregar observadores
    this.userService.search(0, 1000).subscribe({
      next: (response: any) => {
        this.observersList = response.content;
      },
      error: (error: any) => console.error('Erro ao carregar observadores:', error)
    });
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
        this.loading = false;
        this.initialLoad = false;
      },
      error: (error: any) => {
        console.error('Erro ao carregar espécimes:', error);
        this.loading = false;
        this.initialLoad = false;
      }
    });
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
  }

  updateMapCenter(): void {
    if (this.specimens.length > 0 && this.initialLoad) {
      // Calcular centro baseado nos espécimes
      const avgLat = this.specimens.reduce((sum, s) => sum + s.latitude, 0) / this.specimens.length;
      const avgLon = this.specimens.reduce((sum, s) => sum + s.longitude, 0) / this.specimens.length;
      
      this.centerLat = avgLat;
      this.centerLon = avgLon;
      this.initialZoom = 10;
    }
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
    this.loadSpecimens();
  }

  onMarkerClick(marker: MapMarker): void {
    const specimen = marker.data as SpecimenObject;
    console.log('Espécime clicado:', specimen);
    // Aqui você pode abrir um dialog com detalhes do espécime
  }
}
