import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

// PrimeNG
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TabsModule } from 'primeng/tabs';
import { TimelineModule } from 'primeng/timeline';
import { SkeletonModule } from 'primeng/skeleton';
import { DividerModule } from 'primeng/divider';
import { ChipModule } from 'primeng/chip';
import { AvatarModule } from 'primeng/avatar';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

// Services & Models
import { SpecimenObjectService } from '@/core/services/specimen-object.service';
import { SpecimenObject } from '@/core/models/specimen/specimen-object';

@Component({
  selector: 'app-specimen-detail',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    TagModule,
    TabsModule,
    TimelineModule,
    SkeletonModule,
    DividerModule,
    ChipModule,
    AvatarModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './specimen-detail.component.html',
  styleUrls: ['./specimen-detail.component.scss']
})
export class SpecimenDetailComponent implements OnInit, OnDestroy {
  specimen?: SpecimenObject;
  loading = true;
  specimenId!: number;

  // Placeholder data for history (will be replaced with real API data)
  history: any[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private specimenService: SpecimenObjectService,
    private route: ActivatedRoute,
    private router: Router,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.specimenId = +id;
      this.loadSpecimen();
    } else {
      this.router.navigate(['/specimens']);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadSpecimen(): void {
    this.loading = true;
    this.specimenService
      .findById(this.specimenId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (specimen) => {
          this.specimen = specimen;
          this.loading = false;
          // TODO: Load history from SpeciesInfo API
          this.loadHistory();
        },
        error: (error) => {
          console.error('Erro ao carregar espécime:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Erro',
            detail: 'Não foi possível carregar o espécime.'
          });
          this.loading = false;
          this.router.navigate(['/specimens']);
        }
      });
  }

  loadHistory(): void {
    // TODO: Implementar chamada à API de SpeciesInfo
    // Por enquanto, apenas dados de exemplo
    this.history = [];
  }

  navigateToEdit(): void {
    this.router.navigate(['/specimens/edit', this.specimenId]);
  }

  navigateBack(): void {
    this.router.navigate(['/specimens']);
  }

  formatDate(date: Date | undefined): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatCoordinates(lat: number, lng: number): string {
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

  copyCoordinates(): void {
    if (this.specimen) {
      const coords = `${this.specimen.latitude}, ${this.specimen.longitude}`;
      navigator.clipboard.writeText(coords);
      this.messageService.add({
        severity: 'success',
        summary: 'Copiado!',
        detail: 'Coordenadas copiadas para a área de transferência.'
      });
    }
  }
}
