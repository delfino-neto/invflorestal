import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { trigger, transition, style, animate } from '@angular/animations';


import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { DividerModule } from 'primeng/divider';
import { TagModule } from 'primeng/tag';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';


import { CollectionAreaService } from '@/core/services/collection-area.service';
import { CollectionAreaRequest } from '@/core/models/collection/collection-area';
import { AuthService } from '@/core/services/auth.service';


import { GeometryMapComponent } from '@/shared/components/geometry-map';
import { TooltipModule } from 'primeng/tooltip';
import { TextareaModule } from 'primeng/textarea';

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
    AutoCompleteModule,
    InputNumberModule,
    CheckboxModule,
    TooltipModule,
    TextareaModule,
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

  
  drawingInstructions = [
    'Clique no mapa para começar a desenhar',
    'Continue clicando para adicionar pontos',
    'Clique duas vezes para finalizar o polígono',
    'Arraste os pontos para ajustar a forma'
  ];

  
  biomeOptions = [
    'Amazônia',
    'Mata Atlântica',
    'Cerrado',
    'Caatinga',
    'Pampa',
    'Pantanal'
  ];
  filteredBiomes: string[] = [];

  climateOptions = [
    'Tropical úmido',
    'Tropical semiárido',
    'Subtropical úmido',
    'Temperado',
    'Equatorial'
  ];
  filteredClimates: string[] = [];

  soilTypeOptions = [
    'Latossolo',
    'Argissolo',
    'Neossolo',
    'Cambissolo',
    'Nitossolo',
    'Plintossolo',
    'Gleissolo'
  ];
  filteredSoilTypes: string[] = [];

  conservationStatusOptions = [
    'Preservada',
    'Conservada',
    'Degradada',
    'Em recuperação',
    'Regeneração natural'
  ];
  filteredConservationStatus: string[] = [];

  vegetationTypeOptions = [
    'Floresta Ombrófila Densa',
    'Floresta Ombrófila Mista',
    'Floresta Estacional Semidecidual',
    'Floresta Estacional Decidual',
    'Cerrado stricto sensu',
    'Cerradão',
    'Campo Cerrado',
    'Caatinga arbórea',
    'Caatinga arbustiva',
    'Restinga',
    'Manguezal'
  ];
  filteredVegetationTypes: string[] = [];

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
    
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.areaId = +params['id'];
        this.loadArea();
      }
    });
    
    
    this.checkIfShouldShowInstructions();
  }

  createForm(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      notes: [''],
      geometry: ['', Validators.required],
      biome: [''],
      climateZone: [''],
      soilType: [''],
      conservationStatus: [''],
      vegetationType: [''],
      altitudeM: [null],
      protectedArea: [false],
      protectedAreaName: [''],
      landOwner: ['']
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
          geometry: area.geometry,
          biome: area.biome,
          climateZone: area.climateZone,
          soilType: area.soilType,
          conservationStatus: area.conservationStatus,
          vegetationType: area.vegetationType,
          altitudeM: area.altitudeM,
          protectedArea: area.protectedArea,
          protectedAreaName: area.protectedAreaName,
          landOwner: area.landOwner
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
      geometry: this.form.value.geometry,
      biome: this.form.value.biome,
      climateZone: this.form.value.climateZone,
      soilType: this.form.value.soilType,
      conservationStatus: this.form.value.conservationStatus,
      vegetationType: this.form.value.vegetationType,
      altitudeM: this.form.value.altitudeM,
      protectedArea: this.form.value.protectedArea,
      protectedAreaName: this.form.value.protectedAreaName,
      landOwner: this.form.value.landOwner
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

  
  filterBiomes(event: any): void {
    const query = event.query.toLowerCase();
    this.filteredBiomes = this.biomeOptions.filter(biome => 
      biome.toLowerCase().includes(query)
    );
  }

  filterClimates(event: any): void {
    const query = event.query.toLowerCase();
    this.filteredClimates = this.climateOptions.filter(climate => 
      climate.toLowerCase().includes(query)
    );
  }

  filterSoilTypes(event: any): void {
    const query = event.query.toLowerCase();
    this.filteredSoilTypes = this.soilTypeOptions.filter(soil => 
      soil.toLowerCase().includes(query)
    );
  }

  filterConservationStatus(event: any): void {
    const query = event.query.toLowerCase();
    this.filteredConservationStatus = this.conservationStatusOptions.filter(status => 
      status.toLowerCase().includes(query)
    );
  }

  filterVegetationTypes(event: any): void {
    const query = event.query.toLowerCase();
    this.filteredVegetationTypes = this.vegetationTypeOptions.filter(vegetation => 
      vegetation.toLowerCase().includes(query)
    );
  }
}
