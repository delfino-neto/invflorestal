import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MessageService, ConfirmationService } from 'primeng/api';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';

import { CollectionAreaService } from '@/core/services/collection-area.service';
import { PlotService } from '@/core/services/plot.service';
import { SpecimenObjectService } from '@/core/services/specimen-object.service';
import { CollectionArea } from '@/core/models/collection/collection-area';
import { Plot, PlotRequest } from '@/core/models/collection/plot';
import { SpecimenObject } from '@/core/models/specimen/specimen-object';

import { PlotDialogComponent } from '../plot-dialog/plot-dialog.component';
import { PlotImportDialogComponent } from '../plot-import-dialog/plot-import-dialog.component';
import { MapVisualizerComponent, MapMarker } from '@/shared/components/map-visualizer';

@Component({
  selector: 'app-collection-area-detail',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    DividerModule,
    SkeletonModule,
    ToastModule,
    ConfirmDialogModule,
    DialogModule,
    TableModule,
    TagModule,
    TooltipModule,
    PlotDialogComponent,
    MapVisualizerComponent
  ],
  providers: [MessageService, ConfirmationService, DialogService],
  templateUrl: './collection-area-detail.component.html',
  styleUrls: ['./collection-area-detail.component.scss']
})
export class CollectionAreaDetailComponent implements OnInit, OnDestroy {
  area?: CollectionArea;
  plots: Plot[] = [];
  specimens: SpecimenObject[] = [];
  specimenMarkers: MapMarker[] = [];
  selectedPlot?: Plot;
  
  loading = true;
  loadingPlots = false;
  loadingSpecimens = false;
  
  // Dialog states
  showPlotDialog = false;
  isEditingPlot = false;
  plotGeometry?: string;
  
  // Cache para geometrias do mapa
  private cachedMapGeometries: Array<{ geometry: string; label?: string; fillColor?: string; strokeColor?: string; strokeWidth?: number }> = [];
  private lastPlotsVersion = 0; // Para detectar mudanças nos plots
  
  // Controle de highlight no mapa
  highlightedGeometryIndex?: number;
  
  private destroy$ = new Subject<void>();
  private importDialogRef?: DynamicDialogRef;
  areaId!: number;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private collectionAreaService: CollectionAreaService,
    private plotService: PlotService,
    private specimenObjectService: SpecimenObjectService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private dialogService: DialogService
  ) {}

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.areaId = +params['id'];
      this.loadArea();
      this.loadPlots();
      this.loadSpecimens();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.importDialogRef?.close();
  }

  loadArea(): void {
    this.loading = true;
    this.collectionAreaService
      .findById(this.areaId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (area) => {
          this.area = area;
          this.loading = false;
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Erro',
            detail: 'Erro ao carregar área de coleta'
          });
          this.loading = false;
          this.goBack();
        }
      });
  }

  loadPlots(): void {
    this.loadingPlots = true;
    this.plotService
      .searchByArea(this.areaId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.plots = response.content;
          this.loadingPlots = false;
          // Invalidar cache quando plots mudam
          this.cachedMapGeometries = [];
          this.lastPlotsVersion = 0;
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Erro',
            detail: 'Erro ao carregar plots'
          });
          this.loadingPlots = false;
        }
      });
  }

  loadSpecimens(): void {
    this.loadingSpecimens = true;
    this.specimenObjectService
      .findByCollectionAreaId(this.areaId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (specimens) => {
          this.specimens = specimens;
          this.updateSpecimenMarkers();
          this.loadingSpecimens = false;
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Erro',
            detail: 'Erro ao carregar espécimes'
          });
          this.loadingSpecimens = false;
        }
      });
  }

  updateSpecimenMarkers(): void {
    // Criar marcadores a partir dos espécimes
    this.specimenMarkers = this.specimens.map(specimen => ({
      id: specimen.id,
      latitude: Number(specimen.latitude),
      longitude: Number(specimen.longitude),
      type: 'specimen',
      color: '#10b981', // Verde esmeralda
      label: specimen.speciesCommonName || specimen.speciesScientificName?.split(' ').slice(0, 2).join(' ') || '',
      data: specimen,
      onClick: (marker: MapMarker) => {
        this.onSpecimenClick(marker.data);
      }
    }));
  }

  onSpecimenClick(specimen: SpecimenObject): void {
    // Por enquanto apenas mostra no console, pode abrir um dialog ou navegar para detalhe
    this.messageService.add({
      severity: 'info',
      summary: specimen.speciesScientificName || 'Espécime',
      detail: `Plot: ${specimen.plotCode || 'N/A'}`,
      life: 3000
    });
  }

  openNewPlotDialog(): void {
    this.selectedPlot = undefined;
    this.plotGeometry = undefined;
    this.isEditingPlot = false;
    this.showPlotDialog = true;
  }

  openImportPlotDialog(): void {
    this.importDialogRef = this.dialogService.open(PlotImportDialogComponent, {
      header: 'Importar Plot',
      width: '850px',
      modal: true,
      dismissableMask: true,
      styleClass: 'plot-import-dialog-wrapper',
      data: {
        targetAreaId: this.areaId
      }
    }) || undefined;

    this.importDialogRef?.onClose.subscribe((importedPlot) => {
      if (importedPlot) {
        this.loadPlots();
        // Highlight do plot importado após recarregar
        setTimeout(() => {
          const plotIndex = this.plots.findIndex(p => p.id === importedPlot.id);
          if (plotIndex !== -1) {
            this.highlightedGeometryIndex = plotIndex + 1;
            this.selectedPlot = importedPlot;
          }
        }, 500);
      }
    });
  }

  openEditPlotDialog(plot: Plot): void {
    this.selectedPlot = plot;
    this.plotGeometry = plot.geometry;
    this.isEditingPlot = true;
    this.showPlotDialog = true;
  }

  onPlotSaved(): void {
    this.showPlotDialog = false;
    this.loadPlots();
    this.messageService.add({
      severity: 'success',
      summary: 'Sucesso',
      detail: this.isEditingPlot ? 'Plot atualizado com sucesso' : 'Plot criado com sucesso'
    });
  }

  deletePlot(plot: Plot): void {
    this.confirmationService.confirm({
      message: 'Esta ação não pode ser desfeita. Todos os dados associados a este plot serão perdidos.',
      header: 'Tem certeza?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Excluir plot',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-outlined',
      accept: () => {
        if (plot.id) {
          this.plotService.delete(plot.id).subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Sucesso',
                detail: 'Plot excluído com sucesso'
              });
              this.loadPlots();
            },
            error: (error) => {
              this.messageService.add({
                severity: 'error',
                summary: 'Erro',
                detail: 'Erro ao excluir plot'
              });
            }
          });
        }
      }
    });
  }

  selectPlotOnMap(plot: Plot): void {
    // Encontrar o índice do plot nas geometrias (área é index 0, plots começam em 1)
    const plotIndex = this.plots.findIndex(p => p.id === plot.id);
    if (plotIndex !== -1) {
      // +1 porque a área está no index 0
      this.highlightedGeometryIndex = plotIndex + 1;
      this.selectedPlot = plot;
    }
  }

  clearSelection(): void {
    this.highlightedGeometryIndex = undefined;
    this.selectedPlot = undefined;
  }

  goBack(): void {
    this.router.navigate(['/collection-areas']);
  }

  editArea(): void {
    this.router.navigate(['/collection-areas/edit', this.areaId]);
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

  formatDateShort(date?: Date): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  formatTimeAgo(date?: Date): string {
    if (!date) return '';
    
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffMins < 1) return 'agora mesmo';
    if (diffMins < 60) return `há ${diffMins} min`;
    if (diffHours < 24) return `há ${diffHours}h`;
    if (diffDays < 30) return `há ${diffDays} dias`;
    if (diffMonths < 12) return `há ${diffMonths} meses`;
    return `há ${diffYears} anos`;
  }

  getTotalArea(): number {
    return this.plots.reduce((sum, plot) => sum + Number(plot.areaM2 || 0), 0);
  }

  getTotalSpecimens(): number {
    return this.specimens.length;
  }

  getUniqueSpeciesCount(): number {
    const uniqueSpecies = new Set(this.specimens.map(s => s.speciesId));
    return uniqueSpecies.size;
  }

  // Retorna os outros plots (exceto o selecionado) para usar como helper
  getOtherPlots(): Array<{ geometry: string; label: string }> {
    if (!this.selectedPlot) {
      return this.plots.map(plot => ({
        geometry: plot.geometry,
        label: plot.plotCode
      }));
    }
    
    return this.plots
      .filter(plot => plot.id !== this.selectedPlot?.id)
      .map(plot => ({
        geometry: plot.geometry,
        label: plot.plotCode
      }));
  }

  // Prepara geometrias para o MapVisualizer (com cache)
  getMapGeometries(): Array<{ geometry: string; label?: string; fillColor?: string; strokeColor?: string; strokeWidth?: number }> {
    // Criar uma versão baseada no tamanho e ids dos plots
    const currentVersion = this.plots.length + (this.area?.id || 0);
    
    // Se nada mudou, retornar o cache
    if (currentVersion === this.lastPlotsVersion && this.cachedMapGeometries.length > 0) {
      return this.cachedMapGeometries;
    }
    
    // Atualizar versão
    this.lastPlotsVersion = currentVersion;
    
    const geometries: Array<{ geometry: string; label?: string; fillColor?: string; strokeColor?: string; strokeWidth?: number }> = [];

    // Adicionar área da coleção (azul tracejado)
    if (this.area?.geometry) {
      geometries.push({
        geometry: this.area.geometry,
        label: this.area.name,
        fillColor: 'rgba(59, 130, 246, 0.1)',
        strokeColor: 'rgb(59, 130, 246)',
        strokeWidth: 2
      });
    }

    // Cores para os plots
    const plotColors = [
      'rgba(239, 68, 68, 0.3)',   // Red
      'rgba(249, 115, 22, 0.3)',  // Orange
      'rgba(234, 179, 8, 0.3)',   // Yellow
      'rgba(34, 197, 94, 0.3)',   // Green
      'rgba(168, 85, 247, 0.3)',  // Purple
      'rgba(236, 72, 153, 0.3)',  // Pink
      'rgba(20, 184, 166, 0.3)',  // Teal
      'rgba(16, 185, 129, 0.3)',  // Emerald
    ];

    // Adicionar plots
    this.plots.forEach((plot, index) => {
      const fillColor = plotColors[index % plotColors.length];
      const strokeColor = this.rgbaToRgb(fillColor, 0.8);
      
      geometries.push({
        geometry: plot.geometry,
        label: plot.plotCode,
        fillColor: fillColor,
        strokeColor: strokeColor,
        strokeWidth: 2
      });
    });

    // Cachear resultado
    this.cachedMapGeometries = geometries;
    return geometries;
  }

  private rgbaToRgb(rgba: string, opacity: number): string {
    const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${opacity})`;
    }
    return rgba;
  }

  // Para o mapa: combinar geometria da área com plots
  getCombinedGeometries(): { area?: string; plots: Array<{ id?: number; geometry: string; code: string }> } {
    return {
      area: this.area?.geometry,
      plots: this.plots.map(p => ({ id: p.id, geometry: p.geometry, code: p.plotCode }))
    };
  }
}
