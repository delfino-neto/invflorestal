import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';


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


import { SpecimenObjectService } from '@/core/services/specimen-object.service';
import { SpeciesTaxonomyService } from '@/core/services';
import { CollectionAreaService } from '@/core/services';
import { UserService } from '@/core/services';


import { SpecimenObject } from '@/core/models/specimen/specimen-object';
import { SpeciesTaxonomy } from '@/core/models/species/species-taxonomy';
import { CollectionArea } from '@/core/models/collection/collection-area';
import { User } from '@/core/models/user/user';


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
  
  
  selectedSpecies?: SpeciesTaxonomy;
  selectedArea?: CollectionArea;
  selectedObserver?: User;
  
  
  allSpeciesList: SpeciesTaxonomy[] = [];
  allAreasList: CollectionArea[] = [];
  allObserversList: User[] = [];
  
  
  speciesList: SpeciesTaxonomy[] = [];
  areasList: CollectionArea[] = [];
  observersList: User[] = [];
  
  
  loading = false;
  initialLoad = true;
  
  
  showSpecimenDetails = false;
  selectedSpecimen?: SpecimenObject;
  
  
  clusterSpecimens: SpecimenObject[] = [];
  clusterPopoverEvent?: MouseEvent;
  popoverAnchor?: HTMLElement;
  
  
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
    
    
    this.specimenService.findWithFilters().subscribe({
      next: (data: SpecimenObject[]) => {
        this.allSpecimens = data;
        this.specimens = data;
        this.updateMarkers();
        this.updateMapCenter();
        this.loading = false;
        this.initialLoad = false;
        
        
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
    
    this.speciesService.getSpeciesTaxonomies(0, 1000).subscribe({
      next: (response: any) => {
        this.allSpeciesList = response.content;
        this.updateFilteredLists();
      },
      error: (error: any) => console.error('Erro ao carregar espécies:', error)
    });

    
    this.areaService.search(0, 1000).subscribe({
      next: (response: any) => {
        this.allAreasList = response.content;
        this.updateFilteredLists();
      },
      error: (error: any) => console.error('Erro ao carregar áreas:', error)
    });

    
    this.userService.search(0, 1000).subscribe({
      next: (response: any) => {
        this.allObserversList = response.content;
        this.updateFilteredLists();
      },
      error: (error: any) => console.error('Erro ao carregar observadores:', error)
    });
  }

  updateFilteredLists(): void {
    
    const availableSpeciesIds = new Set(this.specimens.map(s => s.speciesId));
    this.speciesList = this.allSpeciesList.filter(species => 
      species.id && availableSpeciesIds.has(species.id)
    );

    
    const availableAreaIds = new Set(this.specimens.map(s => s.areaId).filter(id => id !== undefined));
    this.areasList = this.allAreasList.filter(area => 
      area.id && availableAreaIds.has(area.id)
    );

    
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
    
    
    setTimeout(() => {
      if (this.mapVisualizer) {
        this.mapVisualizer.fitToMarkers();
      }
    }, 300);
  }

  updateMapCenter(): void {
    
  }

  getMarkerColor(speciesId: number): string {
    
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
    
    
    const samePosition = this.specimens.filter(s => 
      Math.abs(s.latitude - marker.latitude) < 0.000001 && 
      Math.abs(s.longitude - marker.longitude) < 0.000001
    );

    

    if (samePosition.length > 1) {
      
      this.clusterSpecimens = samePosition;
      
      
      setTimeout(() => {
        if (this.clusterPopover && event) {
          
          if (this.popoverAnchor) {
            document.body.removeChild(this.popoverAnchor);
          }

          
          const originalEvent = event.originalEvent;
          
          let clientX: number;
          let clientY: number;
          
          if (originalEvent && originalEvent.clientX !== undefined) {
            
            clientX = originalEvent.clientX;
            clientY = originalEvent.clientY;
          } else if (event.pixel) {
            
            const mapElement = event.map?.getTargetElement();
              if (mapElement) {
              const rect = mapElement.getBoundingClientRect();
              clientX = rect.left + event.pixel[0];
              clientY = rect.top + event.pixel[1];
            } else {
              
              clientX = window.innerWidth / 2;
              clientY = window.innerHeight / 2;
            }
          } else {
            
            clientX = window.innerWidth / 2;
            clientY = window.innerHeight / 2;
          }

          
          this.popoverAnchor = document.createElement('div');
          this.popoverAnchor.style.position = 'fixed';
          this.popoverAnchor.style.left = `${clientX - 20}px`;
          this.popoverAnchor.style.top = `${clientY}px`;
          this.popoverAnchor.style.width = '0px';
          this.popoverAnchor.style.height = '0px';
          this.popoverAnchor.style.pointerEvents = 'none';
          this.popoverAnchor.style.zIndex = '9999';
          document.body.appendChild(this.popoverAnchor);

          
          
          this.clusterPopover.show(null, this.popoverAnchor);
        }
      }, 0);
    } else if (samePosition.length === 1) {
      
      this.selectedSpecimen = samePosition[0];
      this.showSpecimenDetails = true;
    } else {
      
      this.selectedSpecimen = marker.data as SpecimenObject;
      this.showSpecimenDetails = true;
    }
  }

  selectSpecimenFromCluster(specimen: SpecimenObject): void {
    this.clusterPopover?.hide();
    
    
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
