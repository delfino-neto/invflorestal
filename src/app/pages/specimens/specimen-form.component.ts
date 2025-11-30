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
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { DividerModule } from 'primeng/divider';

// Services & Models
import { SpecimenObjectService } from '@/core/services/specimen-object.service';
import { SpeciesTaxonomyService } from '@/core/services/species-taxonomy.service';
import { PlotService } from '@/core/services/plot.service';
import { CollectionAreaService } from '@/core/services/collection-area.service';
import { UserService } from '@/core/services/user.service';
import { MediaService } from '@/core/services/media.service';
import { SpeciesInfoService } from '@/core/services/species-info.service';
import { AuthService } from '@/core/services/auth.service';
import { SpecimenObject, SpecimenObjectRequest } from '@/core/models/specimen/specimen-object';
import { SpeciesInfoRequest } from '@/core/models/specimen/species-info';
import { MapVisualizerComponent, MapMarker } from '@/shared/components/map-visualizer';

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
    DatePickerModule,
    DialogModule,
    TooltipModule,
    MapVisualizerComponent,
    DividerModule
  ],
  providers: [MessageService],
  templateUrl: './specimen-form.component.html',
  styleUrls: ['./specimen-form.component.scss']
})
export class SpecimenFormComponent implements OnInit {
  locationForm!: FormGroup;
  speciesInfoForm!: FormGroup;
  loading = false;
  isEditMode = false;
  specimenId?: number;
  createdObjectId?: number;

  // Photos
  selectedPhotos: PhotoFile[] = [];
  previewVisible = false;
  previewImageIndex = 0;
  fileUploadComponent: any;
  
  // Map properties
  selectedPlotGeometry?: string;
  currentMarker: MapMarker[] = [];
  mapGeometries: Array<{ geometry: string; label?: string; fillColor?: string; strokeColor?: string }> = [];

  // Dropdown options
  species: any[] = [];
  plots: any[] = [];
  filteredPlots: any[] = [];
  collectionAreas: any[] = [];
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
    areas: false,
    users: false
  };

  constructor(
    private fb: FormBuilder,
    private specimenService: SpecimenObjectService,
    private speciesService: SpeciesTaxonomyService,
    private plotService: PlotService,
    private collectionAreaService: CollectionAreaService,
    private userService: UserService,
    private mediaService: MediaService,
    private speciesInfoService: SpeciesInfoService,
    private authService: AuthService,
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
    this.locationForm = this.fb.group({
      areaId: [null, Validators.required],
      plotId: [null, Validators.required],
      latitude: [null, [Validators.required, Validators.min(-90), Validators.max(90)]],
      longitude: [null, [Validators.required, Validators.min(-180), Validators.max(180)]]
    });

    this.speciesInfoForm = this.fb.group({
      speciesId: [null, Validators.required],
      observerId: [null, Validators.required],
      observationDate: [new Date()],
      heightM: [null],
      dbmCm: [null],
      ageYears: [null],
      condition: [null]
    });
    
    // Observar mudanças no areaId para filtrar plots
    this.locationForm.get('areaId')?.valueChanges.subscribe(areaId => {
      if (areaId) {
        this.filterPlotsByArea(areaId);
        // Limpar plotId quando mudar de área
        this.locationForm.patchValue({ plotId: null }, { emitEvent: false });
      } else {
        this.filteredPlots = [];
        this.mapGeometries = [];
        this.selectedPlotGeometry = undefined;
      }
    });
    
    // Observar mudanças no plotId para carregar geometria
    this.locationForm.get('plotId')?.valueChanges.subscribe(plotId => {
      if (plotId) {
        this.loadPlotGeometry(plotId);
      } else {
        this.mapGeometries = [];
        this.selectedPlotGeometry = undefined;
      }
    });
    
    // Observar mudanças nas coordenadas para atualizar marcador
    this.locationForm.get('latitude')?.valueChanges.subscribe(() => this.updateMarker());
    this.locationForm.get('longitude')?.valueChanges.subscribe(() => this.updateMarker());
  }

  onPhotosSelect(event: any): void {
    const files = event.currentFiles || event.files;
    
    if (!files || files.length === 0) return;

    // Verificar duplicatas por nome e tamanho
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Aviso',
          detail: `Arquivo ${file.name} não é uma imagem válida`
        });
        continue;
      }

      // Verificar se já existe no array
      const alreadyExists = this.selectedPhotos.some(
        photo => photo.file.name === file.name && photo.file.size === file.size
      );

      if (alreadyExists) {
        continue;
      }

      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.selectedPhotos.push({
          file: file,
          preview: e.target?.result,
          description: ''
        });
      };
      reader.readAsDataURL(file);
    }
  }

  removePhoto(index: number): void {
    this.selectedPhotos.splice(index, 1);
  }

  clearAllPhotos(): void {
    this.selectedPhotos = [];
  }

  openPhotoPreview(index: number): void {
    this.previewImageIndex = index;
    this.previewVisible = true;
  }

  closePhotoPreview(): void {
    this.previewVisible = false;
  }

  onFileUploadClear(): void {
    this.selectedPhotos = [];
  }

  nextPreviewImage(): void {
    this.previewImageIndex = (this.previewImageIndex + 1) % this.selectedPhotos.length;
  }

  previousPreviewImage(): void {
    this.previewImageIndex = this.previewImageIndex === 0 
      ? this.selectedPhotos.length - 1 
      : this.previewImageIndex - 1;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  onLocationFormNext(activateCallback: any): void {
    if (this.locationForm.valid) {
      activateCallback(3);
    } else {
      this.locationForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Atenção',
        detail: 'Preencha todos os campos obrigatórios antes de continuar.'
      });
    }
  }

  loadDropdownData(): void {
    this.loadCollectionAreas();
    
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

    this.loadingData.users = true;
    this.userService.search(0, 1000).subscribe({
      next: (response) => {
        this.users = response.content.map(u => ({
          label: u.name,
          value: u.id
        }));
        this.loadingData.users = false;
        // Auto-preencher observador após carregar usuários
        this.loadCurrentUserAsObserver();
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
  
  loadCollectionAreas(): void {
    this.loadingData.areas = true;
    this.collectionAreaService.search(0, 1000).subscribe({
      next: (response) => {
        this.collectionAreas = response.content.map(a => ({
          label: a.name,
          value: a.id
        }));
        this.loadingData.areas = false;
      },
      error: () => {
        this.loadingData.areas = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Não foi possível carregar as áreas de coleta.'
        });
      }
    });
  }
  
  filterPlotsByArea(areaId: number): void {
    this.filteredPlots = this.plots.filter(p => {
      // Extrair areaId do label que tem formato "PLOT-X - Área Y"
      const match = p.label.match(/(\d+)$/);
      return match && parseInt(match[1]) === areaId;
    });
  }
  
  loadCurrentUserAsObserver(): void {
    this.authService.me().subscribe({
      next: (user) => {
        if (user?.name && this.users.length > 0) {
          // Buscar o usuário na lista pelo nome
          const currentUserInList = this.users.find(u => u.label === user.name);
          
          if (currentUserInList) {
            this.speciesInfoForm.patchValue({
              observerId: currentUserInList.value
            });
          }
        }
      },
      error: (error) => {
        console.error('Erro ao carregar usuário atual:', error);
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
  
  loadPlotGeometry(plotId: number): void {
    this.plotService.findById(plotId).subscribe({
      next: (plot) => {
        if (plot.geometry) {
          this.selectedPlotGeometry = plot.geometry;
          this.mapGeometries = [{
            geometry: plot.geometry,
            label: plot.plotCode,
            fillColor: 'rgba(34, 197, 94, 0.2)',
            strokeColor: 'rgb(34, 197, 94)'
          }];
        }
      },
      error: (error) => {
        console.error('Erro ao carregar geometria do plot:', error);
      }
    });
  }
  
  updateMarker(): void {
    const lat = this.locationForm.get('latitude')?.value;
    const lon = this.locationForm.get('longitude')?.value;
    
    if (lat && lon && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      this.currentMarker = [{
        latitude: Number(lat),
        longitude: Number(lon),
        color: '#f97316', // Laranja vibrante para destacar do fundo verde
        label: '📍 Espécime'
      }];
    } else {
      this.currentMarker = [];
    }
  }
  
  onMapClick(event: { latitude: number; longitude: number }): void {
    // Atualizar os campos de latitude e longitude quando o usuário clicar no mapa
    this.locationForm.patchValue({
      latitude: Number(event.latitude.toFixed(8)),
      longitude: Number(event.longitude.toFixed(8))
    });
    
    this.messageService.add({
      severity: 'success',
      summary: 'Coordenadas atualizadas',
      detail: `Lat: ${event.latitude.toFixed(6)}, Lon: ${event.longitude.toFixed(6)}`,
      life: 2000
    });
  }

  loadSpecimen(id: number): void {
    this.loading = true;
    this.specimenService.findById(id).subscribe({
      next: (specimen) => {
        // Preencher locationForm
        this.locationForm.patchValue({
          areaId: specimen.areaId,
          plotId: specimen.plotId,
          latitude: specimen.latitude,
          longitude: specimen.longitude
        });
        
        // Preencher speciesInfoForm
        this.speciesInfoForm.patchValue({
          speciesId: specimen.speciesId,
          observerId: specimen.observerId
        });
        this.loading = false;
      },
      error: () => {
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
    if (this.locationForm.invalid || this.speciesInfoForm.invalid) {
      this.locationForm.markAllAsTouched();
      this.speciesInfoForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Atenção',
        detail: 'Preencha todos os campos obrigatórios.'
      });
      return;
    }

    this.loading = true;
    
    const infoData = this.speciesInfoForm.value;
    
    // Combinar dados dos dois forms incluindo SpeciesInfo
    const objectRequest: SpecimenObjectRequest = {
      plotId: this.locationForm.value.plotId,
      speciesId: this.speciesInfoForm.value.speciesId,
      latitude: this.locationForm.value.latitude,
      longitude: this.locationForm.value.longitude,
      observerId: this.speciesInfoForm.value.observerId,
      // SpeciesInfo fields
      observationDate: infoData.observationDate,
      heightM: infoData.heightM,
      dbmCm: infoData.dbmCm,
      ageYears: infoData.ageYears,
      condition: infoData.condition
    };

    this.specimenService.create(objectRequest).subscribe({
      next: (createdObject) => {
        this.createdObjectId = createdObject.id;
        
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
              this.finishCreation();
            },
            error: () => {
              this.messageService.add({
                severity: 'warn',
                summary: 'Aviso',
                detail: 'Espécime criado, mas houve erro ao fazer upload de algumas fotos.'
              });
              this.finishCreation();
            }
          });
        } else {
          this.finishCreation();
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
        error: () => {
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
