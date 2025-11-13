import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService, ConfirmationService } from 'primeng/api';
import { debounceTime, Subject } from 'rxjs';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { ProgressBarModule } from 'primeng/progressbar';
import { ChipModule } from 'primeng/chip';
import { SpeciesTaxonomyService } from '../../../core/services/species-taxonomy.service';
import { SpeciesTaxonomy } from '../../../core/models/species/species-taxonomy';

@Component({
  selector: 'app-species-taxonomy-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    ToastModule,
    ConfirmDialogModule,
    CardModule,
    TagModule,
    InputTextModule,
    SelectModule,
    IconFieldModule,
    InputIconModule,
    ProgressBarModule,
    ChipModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './species-taxonomy-list.component.html',
  styleUrl: './species-taxonomy-list.component.scss'
})
export class SpeciesTaxonomyListComponent implements OnInit {
  taxonomies: SpeciesTaxonomy[] = [];
  loading = false;
  totalRecords = 0;
  searchTerm = '';
  selectedFamily: string | null = null;
  selectedGenus: string | null = null;
  families: Array<{ label: string; value: string }> = [];
  genera: Array<{ label: string; value: string }> = [];
  currentPage = 0;
  currentPageSize = 10;
  private searchSubject = new Subject<string>();

  constructor(
    private taxonomyService: SpeciesTaxonomyService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private router: Router
  ) {
    this.searchSubject.pipe(
      debounceTime(500)
    ).subscribe(() => {
      this.loadTaxonomies({ first: 0, rows: this.currentPageSize });
    });
  }

  ngOnInit(): void {
    this.loadFilterOptions();
    this.loadTaxonomies({ first: 0, rows: 10 });
  }
  
  loadFilterOptions(): void {
    this.taxonomyService.getDistinctFamilies().subscribe({
      next: (families) => {
        this.families = families.map(f => ({ label: f, value: f }));
      },
      error: (error) => {
        console.error('Erro ao carregar famílias:', error);
      }
    });
    
    this.taxonomyService.getDistinctGenera().subscribe({
      next: (genera) => {
        this.genera = genera.map(g => ({ label: g, value: g }));
      },
      error: (error) => {
        console.error('Erro ao carregar gêneros:', error);
      }
    });
  }
  
  onSearchChange(): void {
    this.loading = true;
    this.searchSubject.next(this.searchTerm);
  }
  
  onFilterChange(): void {
    this.loadTaxonomies({ first: 0, rows: this.currentPageSize });
  }
  
  clearFilters(): void {
    this.searchTerm = '';
    this.selectedFamily = null;
    this.selectedGenus = null;
    this.loadTaxonomies({ first: 0, rows: this.currentPageSize });
  }
  
  clearSearch(): void {
    this.searchTerm = '';
    this.loadTaxonomies({ first: 0, rows: this.currentPageSize });
  }
  
  clearFamily(): void {
    this.selectedFamily = null;
    this.loadTaxonomies({ first: 0, rows: this.currentPageSize });
  }
  
  clearGenus(): void {
    this.selectedGenus = null;
    this.loadTaxonomies({ first: 0, rows: this.currentPageSize });
  }
  
  hasActiveFilters(): boolean {
    return !!(this.searchTerm || this.selectedFamily || this.selectedGenus);
  }

  loadTaxonomies(event: any): void {
    this.loading = true;
    this.currentPage = event.first / event.rows;
    this.currentPageSize = event.rows;
    
    this.taxonomyService.getSpeciesTaxonomies(
      this.currentPage,
      this.currentPageSize,
      this.searchTerm || undefined,
      this.selectedFamily || undefined,
      this.selectedGenus || undefined
    ).subscribe({
      next: (response) => {
        this.taxonomies = response.content;
        this.totalRecords = response.totalElements;
        this.loading = false;
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Erro ao carregar espécies'
        });
        this.loading = false;
        console.error('Erro ao carregar espécies:', error);
      }
    });
  }

  navigateToNew(): void {
    this.router.navigate(['/species/new']);
  }

  navigateToEdit(id: number): void {
    this.router.navigate(['/species/edit', id]);
  }

  confirmDelete(taxonomy: SpeciesTaxonomy): void {
    this.confirmationService.confirm({
      message: `Tem certeza que deseja excluir "${taxonomy.scientificName}"?`,
      header: 'Confirmar Exclusão',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sim',
      rejectLabel: 'Não',
      accept: () => this.deleteTaxonomy(taxonomy.id!)
    });
  }

  deleteTaxonomy(id: number): void {
    this.taxonomyService.deleteSpeciesTaxonomy(id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Sucesso',
          detail: 'Espécie excluída com sucesso'
        });
        this.loadTaxonomies({ first: 0, rows: 10 });
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Erro ao excluir espécie'
        });
        console.error('Erro ao excluir:', error);
      }
    });
  }
}
