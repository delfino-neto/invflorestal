import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { trigger, transition, style, animate } from '@angular/animations';

// PrimeNG
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { DividerModule } from 'primeng/divider';
import { TagModule } from 'primeng/tag';

// Services & Models
import { CollectionAreaService } from '@/core/services/collection-area.service';
import { CollectionAreaRequest } from '@/core/models/collection/collection-area';
import { AuthService } from '@/core/services/auth.service';

// Shared Components
import { GeometryMapComponent } from '@/shared/components/geometry-map';

@Component({
  selector: 'app-collection-area-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    InputTextModule,
    ButtonModule,
    ToastModule,
    DividerModule,
    TagModule,
    GeometryMapComponent
  ],
  providers: [MessageService],
  templateUrl: './collection-area-form.component.html',
  styleUrls: ['./collection-area-form.component.scss'],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.95)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'scale(0.95)' }))
      ])
    ])
  ]
})
export class CollectionAreaFormComponent implements OnInit {

  form!: FormGroup;
  
  isEditMode = false;
  areaId?: number;
  isSubmitting = false;
  hasDrawnPolygon = false;
  showInstructions = false;
  
  private readonly INSTRUCTIONS_SEEN_KEY = 'collection_area_instructions_seen';

  // Instruções para o usuário
  drawingInstructions = [
    'Clique no mapa para começar a desenhar',
    'Continue clicando para adicionar pontos',
    'Clique duas vezes para finalizar o polígono',
    'Arraste os pontos para ajustar a forma'
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private collectionAreaService: CollectionAreaService,
    private authService: AuthService,
    private messageService: MessageService
  ) {
    this.createForm();
  }

  ngOnInit(): void {
    // Verificar se é modo de edição
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.areaId = +params['id'];
        this.loadArea();
      }
    });
    
    // Verificar se deve mostrar instruções
    this.checkIfShouldShowInstructions();
  }

  createForm(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      notes: [''],
      geometry: ['', Validators.required]
    });
  }

  checkIfShouldShowInstructions(): void {
    const hasSeenInstructions = localStorage.getItem(this.INSTRUCTIONS_SEEN_KEY);
    if (!hasSeenInstructions && !this.isEditMode) {
      this.showInstructions = true;
    }
  }

  closeInstructions(): void {
    this.showInstructions = false;
    localStorage.setItem(this.INSTRUCTIONS_SEEN_KEY, 'true');
  }

  onBackdropClick(): void {
    this.closeInstructions();
  }

  onGeometryChange(geometry: string | null): void {
    this.hasDrawnPolygon = !!geometry;
  }

  loadArea(): void {
    if (!this.areaId) return;

    this.collectionAreaService.findById(this.areaId).subscribe({
      next: (area) => {
        this.form.patchValue({
          name: area.name,
          notes: area.notes,
          geometry: area.geometry
        });
        this.hasDrawnPolygon = !!area.geometry;
      },
      error: (error) => {
        console.error('Erro ao carregar área:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Erro ao carregar área de coleta'
        });
        this.router.navigate(['/collection-areas']);
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.markFormGroupTouched(this.form);
      this.messageService.add({
        severity: 'warn',
        summary: 'Atenção',
        detail: 'Preencha todos os campos obrigatórios e desenhe a área no mapa'
      });
      return;
    }

    this.isSubmitting = true;

    const request: CollectionAreaRequest = {
      name: this.form.value.name,
      notes: this.form.value.notes,
      geometry: this.form.value.geometry
    };

    const operation = this.isEditMode && this.areaId
      ? this.collectionAreaService.update(this.areaId, request)
      : this.collectionAreaService.create(request);

    operation.subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Sucesso',
          detail: `Área de coleta ${this.isEditMode ? 'atualizada' : 'criada'} com sucesso`
        });
        setTimeout(() => {
          this.router.navigate(['/collection-areas']);
        }, 1500);
      },
      error: (error) => {
        console.error('Erro ao salvar área:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: `Erro ao ${this.isEditMode ? 'atualizar' : 'criar'} área de coleta`
        });
        this.isSubmitting = false;
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/collection-areas']);
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.form.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return 'Campo obrigatório';
      if (field.errors['minlength']) return `Mínimo de ${field.errors['minlength'].requiredLength} caracteres`;
    }
    return '';
  }
}
