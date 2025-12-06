import { Component, OnInit, OnChanges, SimpleChanges, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { FloatLabelModule } from 'primeng/floatlabel';
import { SpeciesTaxonomyService } from '../../../core/services/species-taxonomy.service';
import { SpeciesTaxonomy } from '../../../core/models/species/species-taxonomy';

@Component({
  selector: 'app-species-taxonomy-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    InputTextModule,
    ButtonModule,
    FloatLabelModule
  ],
  templateUrl: './species-taxonomy-form.component.html',
  styleUrl: './species-taxonomy-form.component.scss'
})
export class SpeciesTaxonomyFormComponent implements OnInit, OnChanges {
  @Input() visible: boolean = false;
  @Input() taxonomyId: number | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() onSave = new EventEmitter<void>();
  
  taxonomyForm!: FormGroup;
  isEditMode = false;
  isSubmitting = false;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private taxonomyService: SpeciesTaxonomyService,
    private messageService: MessageService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    if (this.taxonomyId) {
      this.isEditMode = true;
      this.loadTaxonomy(this.taxonomyId);
    }
  }

  ngOnChanges(): void {
    if (this.visible && this.taxonomyId) {
      this.isEditMode = true;
      this.loadTaxonomy(this.taxonomyId);
    } else if (this.visible && !this.taxonomyId) {
      this.isEditMode = false;
      this.taxonomyForm.reset();
    }
  }

  private initializeForm(): void {
    this.taxonomyForm = this.fb.group({
      scientificName: ['', [
        Validators.required,
        Validators.minLength(3),
        Validators.pattern(/^[A-Z][a-z]+ [a-z]+.*$/)
      ]],
      commonName: ['', [
        Validators.maxLength(100)
      ]],
      family: ['', [
        Validators.maxLength(50),
        Validators.pattern(/^[A-Z][a-z]+/)
      ]],
      genus: ['', [
        Validators.maxLength(50),
        Validators.pattern(/^[A-Z][a-z]+$/)
      ]],
      code: ['', [
        Validators.minLength(3),
        Validators.maxLength(20),
        Validators.pattern(/^[A-Z0-9][A-Z0-9\-_]*$/)
      ]]
    });
  }

  loadTaxonomy(id: number): void {
    this.taxonomyService.getSpeciesTaxonomyById(id).subscribe({
      next: (taxonomy: SpeciesTaxonomy) => {
        this.taxonomyForm.patchValue(taxonomy);
      },
      error: (error) => {
        this.showError('Erro ao carregar taxonomia');
        console.error('Erro ao carregar taxonomia:', error);
      }
    });
  }

  onSubmit(): void {
    if (this.taxonomyForm.invalid || this.isSubmitting) {
      this.taxonomyForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const formData = this.taxonomyForm.value as any;

    const operation = this.isEditMode
      ? this.taxonomyService.updateSpeciesTaxonomy(this.taxonomyId!, formData)
      : this.taxonomyService.createSpeciesTaxonomy(formData);

    operation.subscribe({
      next: () => {
        this.showSuccess(
          this.isEditMode 
            ? 'Taxonomia atualizada com sucesso!' 
            : 'Taxonomia criada com sucesso!'
        );
        this.isSubmitting = false;
        this.closeDialog();
        this.onSave.emit();
      },
      error: (error) => {
        this.showError('Erro ao salvar taxonomia');
        console.error('Erro ao salvar:', error);
        this.isSubmitting = false;
      }
    });
  }

  onCancel(): void {
    this.closeDialog();
  }

  closeDialog(): void {
    this.visible = false;
    this.visibleChange.emit(false);
    this.taxonomyForm.reset();
    this.taxonomyId = null;
    this.isEditMode = false;
  }

  onScientificNameChange(event: any): void {
    const value = event.target.value;
    if (value && value.includes(' ')) {
      const parts = value.split(' ');
      const genus = parts[0];
      const species = parts[1];
      
      if (!this.taxonomyForm.get('genus')?.value && genus) {
        this.taxonomyForm.patchValue({ genus });
      }
      
      if (genus && species && !this.taxonomyForm.get('code')?.value) {
        const code = this.generateCode(genus, species);
        this.taxonomyForm.patchValue({ code });
      }
    }
  }

  private generateCode(genus: string, species: string): string {
    const genusCode = genus.substring(0, 3).toUpperCase();
    const speciesCode = species.substring(0, 3).toUpperCase();
    return `${genusCode}${speciesCode}`;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.taxonomyForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.taxonomyForm.get(fieldName);
    if (!field || !field.errors || !field.touched) return '';

    const errors = field.errors;

    switch (fieldName) {
      case 'scientificName':
        if (errors['required']) return 'Nome científico é obrigatório';
        if (errors['minlength']) return 'Mínimo 3 caracteres';
        if (errors['pattern']) return 'Formato inválido (ex: Genus species)';
        break;
      case 'commonName':
        if (errors['maxlength']) return 'Máximo 100 caracteres';
        break;
      case 'family':
        if (errors['maxlength']) return 'Máximo 50 caracteres';
        if (errors['pattern']) return 'Deve começar com letra maiúscula';
        break;
      case 'genus':
        if (errors['maxlength']) return 'Máximo 50 caracteres';
        if (errors['pattern']) return 'Apenas letras, começando com maiúscula';
        break;
      case 'species':
        if (errors['maxlength']) return 'Máximo 50 caracteres';
        if (errors['pattern']) return 'Apenas letras minúsculas';
        break;
      case 'code':
        if (errors['minlength']) return 'Mínimo 3 caracteres';
        if (errors['maxlength']) return 'Máximo 20 caracteres';
        if (errors['pattern']) return 'Formato inválido (ex: H-ALBUS-001)';
        break;
    }
    return 'Campo inválido';
  }

  private showSuccess(message: string): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Sucesso',
      detail: message,
      life: 3000
    });
  }

  private showError(message: string): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Erro',
      detail: message,
      life: 5000
    });
  }
}