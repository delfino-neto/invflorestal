import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MessageService, ConfirmationService } from 'primeng/api';

// PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';

// Services & Models
import { SpeciesTaxonomyService } from '../../../core/services/species-taxonomy.service';
import { SpeciesTaxonomy } from '../../../core/models/species/species-taxonomy';

@Component({
  selector: 'app-species-taxonomy-list',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    ToastModule,
    ConfirmDialogModule,
    CardModule,
    TagModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './species-taxonomy-list.component.html',
  styleUrl: './species-taxonomy-list.component.scss'
})
export class SpeciesTaxonomyListComponent implements OnInit {
  taxonomies: SpeciesTaxonomy[] = [];
  loading = false;
  totalRecords = 0;

  constructor(
    private taxonomyService: SpeciesTaxonomyService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadTaxonomies({ first: 0, rows: 10 });
  }

  loadTaxonomies(event: any): void {
    this.loading = true;
    const page = event.first / event.rows;
    const size = event.rows;

    this.taxonomyService.getSpeciesTaxonomies(page, size).subscribe({
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
    this.router.navigate(['/species/taxonomy/new']);
  }

  navigateToEdit(id: number): void {
    this.router.navigate(['/species/taxonomy/edit', id]);
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
          detail: 'Taxonomia excluída com sucesso'
        });
        this.loadTaxonomies({ first: 0, rows: 10 });
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Erro ao excluir taxonomia'
        });
        console.error('Erro ao excluir:', error);
      }
    });
  }
}
