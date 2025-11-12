import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

// PrimeNG
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { ChipModule } from 'primeng/chip';
import { AvatarModule } from 'primeng/avatar';

// Services & Models
import { CollectionAreaService } from '@/core/services/collection-area.service';
import { CollectionArea } from '@/core/models/collection/collection-area';
import { Page } from '@/core/services';

// Components
import { CollectionAreaCardComponent } from '../collection-area-card/collection-area-card.component';

@Component({
  selector: 'app-collection-area-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    SkeletonModule,
    TagModule,
    TooltipModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    PaginatorModule,
    ChipModule,
    AvatarModule,
    CollectionAreaCardComponent
  ],
  templateUrl: './collection-area-list.component.html',
  styleUrls: ['./collection-area-list.component.scss']
})
export class CollectionAreaListComponent implements OnInit, OnDestroy {
  areas: CollectionArea[] = [];
  loading = true;
  searchTerm = '';
  
  // Paginação
  currentPage = 0;
  pageSize = 9; // 3x3 grid
  totalRecords = 0;
  
  private destroy$ = new Subject<void>();

  constructor(
    private collectionAreaService: CollectionAreaService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadAreas();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAreas(): void {
    this.loading = true;
    this.collectionAreaService
      .search(this.currentPage, this.pageSize, this.searchTerm)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: Page<CollectionArea>) => {
          this.areas = response.content;
          this.totalRecords = response.totalElements;
          this.loading = false;
        },
        error: (error) => {
          console.error('Erro ao carregar áreas de coleta:', error);
          this.loading = false;
        }
      });
  }

  onPageChange(event: PaginatorState): void {
    this.currentPage = event.page || 0;
    this.pageSize = event.rows || 9;
    this.loadAreas();
  }

  onSearch(): void {
    this.currentPage = 0;
    this.loadAreas();
  }

  navigateToNew(): void {
    this.router.navigate(['/collection-areas/new']);
  }

  navigateToEdit(id: number): void {
    this.router.navigate(['/collection-areas/edit', id]);
  }

  navigateToView(id: number): void {
    this.router.navigate(['/collection-areas/view', id]);
  }

  onDelete(id: number): void {
    // A confirmação será tratada no card component
    this.loadAreas();
  }
}
