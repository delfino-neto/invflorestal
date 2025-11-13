import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';

// PrimeNG
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

// Services & Models
import { SpecimenObjectService } from '@/core/services/specimen-object.service';
import { SpeciesTaxonomyService } from '@/core/services/species-taxonomy.service';
import { PlotService } from '@/core/services/plot.service';
import { UserService } from '@/core/services/user.service';
import { SpecimenObject, SpecimenObjectRequest } from '@/core/models/specimen/specimen-object';

@Component({
  selector: 'app-specimen-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    InputTextModule,
    ButtonModule,
    ToastModule,
    SelectModule,
    InputNumberModule,
    ProgressSpinnerModule
  ],
  providers: [MessageService],
  templateUrl: './specimen-form.component.html',
  styleUrls: ['./specimen-form.component.scss']
})
export class SpecimenFormComponent implements OnInit {
  form!: FormGroup;
  loading = false;
  isEditMode = false;
  specimenId?: number;

  // Dropdown options
  species: any[] = [];
  plots: any[] = [];
  users: any[] = [];

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
    private router: Router,
    private route: ActivatedRoute,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadDropdownData();
    this.checkEditMode();
  }

  initializeForm(): void {
    this.form = this.fb.group({
      plotId: [null, Validators.required],
      speciesId: [null, Validators.required],
      latitude: [null, [Validators.required, Validators.min(-90), Validators.max(90)]],
      longitude: [null, [Validators.required, Validators.min(-180), Validators.max(180)]],
      observerId: [null, Validators.required]
    });
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
        this.form.patchValue({
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
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const request: SpecimenObjectRequest = this.form.value;

    const operation = this.isEditMode
      ? this.specimenService.update(this.specimenId!, request)
      : this.specimenService.create(request);

    operation.subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Sucesso',
          detail: `Espécime ${this.isEditMode ? 'atualizado' : 'cadastrado'} com sucesso.`
        });
        setTimeout(() => {
          this.router.navigate(['/specimens']);
        }, 1500);
      },
      error: (error) => {
        console.error('Erro ao salvar espécime:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: `Não foi possível ${this.isEditMode ? 'atualizar' : 'cadastrar'} o espécime.`
        });
        this.loading = false;
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/specimens']);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.form.get(fieldName);
    if (field?.hasError('required')) {
      return 'Campo obrigatório';
    }
    if (field?.hasError('min') || field?.hasError('max')) {
      return 'Valor inválido';
    }
    return '';
  }
}
