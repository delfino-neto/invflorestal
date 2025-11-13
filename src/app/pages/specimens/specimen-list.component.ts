import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil, debounceTime } from 'rxjs';

// PrimeNG
import { DataViewModule } from 'primeng/dataview';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { CardModule } from 'primeng/card';
import { ChipModule } from 'primeng/chip';
import { AvatarModule } from 'primeng/avatar';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { DividerModule } from 'primeng/divider';
import { RippleModule } from 'primeng/ripple';
import { PaginatorModule } from 'primeng/paginator';
import { GalleriaModule } from 'primeng/galleria';
import { ImageModule } from 'primeng/image';

// Services & Models
import { SpecimenObjectService } from '@/core/services/specimen-object.service';
import { SpecimenObject } from '@/core/models/specimen/specimen-object';
import { Page } from '@/core/services';

@Component({
  selector: 'app-specimen-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DataViewModule,
    ButtonModule,
    SkeletonModule,
    TagModule,
    TooltipModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    CardModule,
    ChipModule,
    AvatarModule,
    ToastModule,
    ConfirmDialogModule,
    DividerModule,
    RippleModule,
    PaginatorModule,
    GalleriaModule,
    ImageModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './specimen-list.component.html',
  styleUrls: ['./specimen-list.component.scss']
})
export class SpecimenListComponent implements OnInit, OnDestroy {
  specimens: SpecimenObject[] = [];
  loading = true;
  searchTerm = '';
  
  // Paginação
  currentPage = 0;
  pageSize = 12;
  totalRecords = 0;
  
  // Controles de visualização
  layout: 'grid' | 'list' = 'grid';
  
  private destroy$ = new Subject<void>();
  private searchSubject$ = new Subject<string>();

  constructor(
    private specimenService: SpecimenObjectService,
    private router: Router,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.loadSpecimens();
    this.setupSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setupSearch(): void {
    this.searchSubject$
      .pipe(
        debounceTime(400),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.currentPage = 0;
        this.loadSpecimens();
      });
  }

  loadSpecimens(): void {
    this.loading = true;
    this.specimenService
      .search(this.currentPage, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: Page<SpecimenObject>) => {
          this.specimens = response.content;
          this.totalRecords = response.totalElements;
          this.loading = false;
          console.log('Specimens loaded:', this.specimens);
          console.log('Total records:', this.totalRecords);
        },
        error: (error) => {
          console.error('Erro ao carregar espécimes:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Erro',
            detail: 'Não foi possível carregar os espécimes.'
          });
          this.loading = false;
        }
      });
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchSubject$.next(value);
  }

  onPageChange(event: any): void {
    this.currentPage = event.page ?? 0;
    this.pageSize = event.rows ?? 12;
    this.loadSpecimens();
  }

  navigateToNew(): void {
    this.router.navigate(['/specimens/new']);
  }

  navigateToView(id: number): void {
    this.router.navigate(['/specimens/view', id]);
  }

  navigateToEdit(id: number): void {
    this.router.navigate(['/specimens/edit', id]);
  }

  confirmDelete(specimen: SpecimenObject): void {
    this.confirmationService.confirm({
      message: `Tem certeza que deseja excluir o espécime de ${specimen.speciesCommonName || specimen.speciesScientificName}?`,
      header: 'Confirmar Exclusão',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sim, excluir',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.deleteSpecimen(specimen.id!);
      }
    });
  }

  deleteSpecimen(id: number): void {
    this.specimenService.delete(id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Sucesso',
          detail: 'Espécime excluído com sucesso.'
        });
        this.loadSpecimens();
      },
      error: (error) => {
        console.error('Erro ao excluir espécime:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Não foi possível excluir o espécime.'
        });
      }
    });
  }

  getSeverity(specimen: SpecimenObject): string {
    // Pode ser customizado com base em alguma lógica de negócio
    return 'success';
  }

  formatDate(date: Date | undefined): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  formatCoordinates(lat: number | undefined, lng: number | undefined): string {
    if (lat === undefined || lng === undefined) {
      return 'Coordenadas não disponíveis';
    }
    return `${lat.toFixed(6)}°, ${lng.toFixed(6)}°`;
  }

  getInitials(name: string | undefined): string {
    if (!name) return '??';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }
}
