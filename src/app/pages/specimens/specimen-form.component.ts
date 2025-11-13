/**
 * Specimen Form Component
 * 
 * Formulário em 3 etapas para criação de espécimes:
 * 
 * Etapa 1: Upload de Fotos
 * - Upload opcional de múltiplas fotos do espécime
 * - Adição de descrição para cada foto
 * 
 * Etapa 2: Dados do Objeto (SpecimenObject)
 * - Informações de localização (latitude/longitude)
 * - Seleção de espécie, parcela e observador
 * 
 * Etapa 3: Informações da Espécie (SpeciesInfo)
 * - Medições: altura, DAP (diâmetro à altura do peito), idade
 * - Condição do espécime
 * - Data de observação
 * 
 * Fluxo de criação:
 * 1. Cria o SpecimenObject
 * 2. Faz upload das fotos (se houver)
 * 3. Salva as informações de medição (se preenchidas)
 */

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { forkJoin } from 'rxjs';

// PrimeNG
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { StepperModule } from 'primeng/stepper';
import { FileUploadModule } from 'primeng/fileupload';
import { DatePickerModule } from 'primeng/datepicker';

// Services & Models
import { SpecimenObjectService } from '@/core/services/specimen-object.service';
import { SpeciesTaxonomyService } from '@/core/services/species-taxonomy.service';
import { PlotService } from '@/core/services/plot.service';
import { UserService } from '@/core/services/user.service';
import { MediaService } from '@/core/services/media.service';
import { SpeciesInfoService } from '@/core/services/species-info.service';
import { SpecimenObject, SpecimenObjectRequest } from '@/core/models/specimen/specimen-object';
import { SpeciesInfoRequest } from '@/core/models/specimen/species-info';

interface PhotoFile {
  file: File;
  preview: string;
  description?: string;
}

@Component({
  selector: 'app-specimen-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    CardModule,
    InputTextModule,
    ButtonModule,
    ToastModule,
    SelectModule,
    InputNumberModule,
    ProgressSpinnerModule,
    StepperModule,
    FileUploadModule,
    DatePickerModule
  ],
  providers: [MessageService],
  templateUrl: './specimen-form.component.html',
  styleUrls: ['./specimen-form.component.scss']
})
export class SpecimenFormComponent implements OnInit {
  objectForm!: FormGroup;
  speciesInfoForm!: FormGroup;
  loading = false;
  isEditMode = false;
  specimenId?: number;
  createdObjectId?: number;
  activeStep = 0;

  // Photos
  selectedPhotos: PhotoFile[] = [];

  // Dropdown options
  species: any[] = [];
  plots: any[] = [];
  users: any[] = [];
  conditionOptions = [
    { label: 'Excelente', value: 1 },
    { label: 'Boa', value: 2 },
    { label: 'Regular', value: 3 },
    { label: 'Ruim', value: 4 },
    { label: 'Morta', value: 5 }
  ];

  loadingData = {
    species: false,
    plots: false,
    users: false
  };

  constructor(
    private fb: FormBuilder,
    private specimenService: SpecimenObjectService,
    private speciesService: SpeciesTaxonomyService,
    private plotService: PlotService,
    private userService: UserService,
    private mediaService: MediaService,
    private speciesInfoService: SpeciesInfoService,
    private router: Router,
    private route: ActivatedRoute,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.initializeForms();
    this.loadDropdownData();
    this.checkEditMode();
  }

  initializeForms(): void {
    // Form for SpecimenObject (Step 2)
    this.objectForm = this.fb.group({
      plotId: [null, Validators.required],
      speciesId: [null, Validators.required],
      latitude: [null, [Validators.required, Validators.min(-90), Validators.max(90)]],
      longitude: [null, [Validators.required, Validators.min(-180), Validators.max(180)]],
      observerId: [null, Validators.required]
    });

    // Form for SpeciesInfo (Step 3)
    this.speciesInfoForm = this.fb.group({
      observationDate: [new Date()],
      heightM: [null],
      dbmCm: [null],
      ageYears: [null],
      condition: [null]
    });
  }

  // Photo handling methods
  onPhotosSelect(event: any): void {
    const files = event.currentFiles || event.files;
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.selectedPhotos.push({
          file: file,
          preview: e.target.result,
          description: ''
        });
      };
      reader.readAsDataURL(file);
    }
  }

  onPhotoRemove(event: any): void {
    const index = this.selectedPhotos.findIndex(p => p.file === event.file);
    if (index !== -1) {
      this.selectedPhotos.splice(index, 1);
    }
  }

  removePhoto(index: number): void {
    this.selectedPhotos.splice(index, 1);
  }

  // Step navigation
  onObjectFormNext(activateCallback: any): void {
    if (this.objectForm.valid) {
      activateCallback(3);
    } else {
      this.objectForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Atenção',
        detail: 'Preencha todos os campos obrigatórios antes de continuar.'
      });
    }
  }

  loadDropdownData(): void {
    // Load species
    this.loadingData.species = true;
    this.speciesService.getSpeciesTaxonomies(0, 1000).subscribe({
      next: (response) => {
        this.species = response.content.map(s => ({
          label: `${s.scientificName} (${s.commonName})`,
          value: s.id
        }));
        this.loadingData.species = false;
      },
      error: () => {
        this.loadingData.species = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Não foi possível carregar as espécies.'
        });
      }
    });

    // Load plots
    this.loadingData.plots = true;
    this.plotService.search(0, 1000).subscribe({
      next: (response) => {
        this.plots = response.content.map(p => ({
          label: `${p.plotCode} - Área ${p.areaId}`,
          value: p.id
        }));
        this.loadingData.plots = false;
      },
      error: () => {
        this.loadingData.plots = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Não foi possível carregar as parcelas.'
        });
      }
    });

    // Load users
    this.loadingData.users = true;
    this.userService.search(0, 1000).subscribe({
      next: (response) => {
        this.users = response.content.map(u => ({
          label: u.name,
          value: u.id
        }));
        this.loadingData.users = false;
      },
      error: () => {
        this.loadingData.users = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Não foi possível carregar os usuários.'
        });
      }
    });
  }

  checkEditMode(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.specimenId = +id;
      this.loadSpecimen(this.specimenId);
    }
  }

  loadSpecimen(id: number): void {
    this.loading = true;
    this.specimenService.findById(id).subscribe({
      next: (specimen) => {
        this.objectForm.patchValue({
          plotId: specimen.plotId,
          speciesId: specimen.speciesId,
          latitude: specimen.latitude,
          longitude: specimen.longitude,
          observerId: specimen.observerId
        });
        this.loading = false;
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

  onSubmit(): void {
    if (this.objectForm.invalid) {
      this.objectForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Atenção',
        detail: 'Preencha todos os campos obrigatórios do objeto.'
      });
      return;
    }

    this.loading = true;

    // Step 1: Create SpecimenObject
    const objectRequest: SpecimenObjectRequest = this.objectForm.value;

    this.specimenService.create(objectRequest).subscribe({
      next: (createdObject) => {
        this.createdObjectId = createdObject.id;
        
        // Step 2: Upload photos if any
        const photoUploads = this.selectedPhotos.map(photo =>
          this.mediaService.uploadImage(
            createdObject.id!,
            photo.file,
            photo.description
          )
        );

        if (photoUploads.length > 0) {
          forkJoin(photoUploads).subscribe({
            next: () => {
              this.createSpeciesInfo();
            },
            error: (error) => {
              console.error('Erro ao fazer upload das fotos:', error);
              this.messageService.add({
                severity: 'warn',
                summary: 'Aviso',
                detail: 'Espécime criado, mas houve erro ao fazer upload de algumas fotos.'
              });
              this.createSpeciesInfo();
            }
          });
        } else {
          this.createSpeciesInfo();
        }
      },
      error: (error) => {
        console.error('Erro ao criar espécime:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Não foi possível criar o espécime.'
        });
        this.loading = false;
      }
    });
  }

  createSpeciesInfo(): void {
    // Step 3: Create SpeciesInfo if there's any data
    const infoData = this.speciesInfoForm.value;
    const hasInfoData = infoData.heightM || infoData.dbmCm || infoData.ageYears || infoData.condition;

    if (hasInfoData && this.createdObjectId) {
      const infoRequest: SpeciesInfoRequest = {
        objectId: this.createdObjectId,
        observationDate: infoData.observationDate || new Date(),
        heightM: infoData.heightM,
        dbmCm: infoData.dbmCm,
        ageYears: infoData.ageYears,
        condition: infoData.condition
      };

      this.speciesInfoService.create(infoRequest).subscribe({
        next: () => {
          this.finishCreation();
        },
        error: (error) => {
          console.error('Erro ao criar informações da espécie:', error);
          this.messageService.add({
            severity: 'warn',
            summary: 'Aviso',
            detail: 'Espécime criado, mas houve erro ao salvar as medições.'
          });
          this.finishCreation();
        }
      });
    } else {
      this.finishCreation();
    }
  }

  finishCreation(): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Sucesso',
      detail: 'Espécime cadastrado com sucesso.'
    });
    setTimeout(() => {
      this.router.navigate(['/specimens']);
    }, 1500);
  }

  onCancel(): void {
    this.router.navigate(['/specimens']);
  }

  isFieldInvalid(fieldName: string, form: FormGroup): boolean {
    const field = form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string, form: FormGroup): string {
    const field = form.get(fieldName);
    if (field?.hasError('required')) {
      return 'Campo obrigatório';
    }
    if (field?.hasError('min') || field?.hasError('max')) {
      return 'Valor inválido';
    }
    return '';
  }
}
