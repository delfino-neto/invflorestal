import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from "@angular/forms";
import { MessageService, ConfirmationService } from 'primeng/api';

// PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { AvatarModule } from 'primeng/avatar';
import { MenuModule } from 'primeng/menu';
import { PasswordModule } from 'primeng/password';
import { MenuItem } from 'primeng/api';

import { User, Role, UserRequest, UserUpdateRequest } from "@/core/models/user/user";
import { UserService } from "@/core/services/user.service";

@Component({
    templateUrl: './user-management.component.html',
    standalone: true,
    imports: [
        CommonModule, 
        ReactiveFormsModule,
        FormsModule,
        ButtonModule, 
        TableModule, 
        TooltipModule, 
        DialogModule,
        InputTextModule,
        DatePickerModule,
        SelectModule,
        MultiSelectModule,
        ToastModule,
        ConfirmDialogModule,
        TagModule,
        IconFieldModule,
        InputIconModule,
        CardModule,
        CheckboxModule,
        AvatarModule,
        MenuModule,
        PasswordModule
    ],
    providers: [MessageService, ConfirmationService]
})
export class UserManagementComponent implements OnInit {

    users: User[] = [];
    roles: Role[] = [];
    totalRecords = 0;
    loading = false;
    
    // Dialog
    userDialog = false;
    userForm!: FormGroup;
    isEditMode = false;
    editingUserId?: number;
    
    // Search
    searchTerm = '';
    
    // Pagination
    currentPage = 0;
    pageSize = 10;

    constructor(
        private userService: UserService,
        private fb: FormBuilder,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {}

    ngOnInit(): void {
        this.initializeForm();
        this.loadRoles();
        this.loadUsers();
    }

    initializeForm(): void {
        this.userForm = this.fb.group({
            firstName: ['', Validators.required],
            lastName: ['', Validators.required],
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required, Validators.minLength(6)]],
            enabled: [true],
            accountLocked: [false],
            roleIds: [[], Validators.required]
        });
    }

    loadRoles(): void {
        this.userService.getRoles().subscribe({
            next: (roles) => {
                this.roles = roles.map(role => ({
                    ...role,
                    label: role.name,
                    value: role.id
                })) as any;
            },
            error: (error) => {
                console.error('Erro ao carregar roles:', error);
            }
        });
    }

    loadUsers(page: number = 0): void {
        this.loading = true;
        this.currentPage = page;
        
        this.userService.search(page, this.pageSize, this.searchTerm || undefined).subscribe({
            next: (response) => {
                this.users = response.content;
                this.totalRecords = response.totalElements;
                this.loading = false;
            },
            error: (error) => {
                console.error('Erro ao carregar usuários:', error);
                this.loading = false;
                this.messageService.add({
                    severity: 'error',
                    summary: 'Erro',
                    detail: 'Não foi possível carregar os usuários'
                });
            }
        });
    }

    onPageChange(event: any): void {
        this.pageSize = event.rows;
        this.loadUsers(event.page);
    }

    onSearch(): void {
        this.loadUsers(0);
    }

    openNew(): void {
        this.isEditMode = false;
        this.editingUserId = undefined;
        this.userForm.reset({
            enabled: true,
            accountLocked: false
        });
        this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
        this.userForm.get('password')?.updateValueAndValidity();
        this.userDialog = true;
    }

    editUser(user: User): void {
        this.isEditMode = true;
        this.editingUserId = user.id;
        
        // Para edição, senha é opcional
        this.userForm.get('password')?.clearValidators();
        this.userForm.get('password')?.updateValueAndValidity();
        
        // Extrair IDs das roles
        const roleIds = this.roles
            .filter(role => user.roles.includes(role.name))
            .map(role => role.id);
        
        this.userForm.patchValue({
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            password: '',
            enabled: user.enabled,
            accountLocked: user.accountLocked,
            roleIds: roleIds
        });
        
        this.userDialog = true;
    }

    hideDialog(): void {
        this.userDialog = false;
        this.userForm.reset();
    }

    saveUser(): void {
        if (this.userForm.invalid) {
            this.userForm.markAllAsTouched();
            return;
        }

        const formValue = this.userForm.value;
        
        if (this.isEditMode && this.editingUserId) {
            // Update
            const updateRequest: UserUpdateRequest = {
                firstName: formValue.firstName,
                lastName: formValue.lastName,
                email: formValue.email,
                enabled: formValue.enabled,
                accountLocked: formValue.accountLocked,
                roleIds: formValue.roleIds
            };
            
            // Só incluir senha se foi preenchida
            if (formValue.password && formValue.password.trim() !== '') {
                updateRequest.password = formValue.password;
            }
            
            this.userService.update(this.editingUserId, updateRequest).subscribe({
                next: () => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Sucesso',
                        detail: 'Usuário atualizado com sucesso'
                    });
                    this.hideDialog();
                    this.loadUsers(this.currentPage);
                },
                error: (error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Erro',
                        detail: error.error?.message || 'Erro ao atualizar usuário'
                    });
                }
            });
        } else {
            // Create
            const createRequest: UserRequest = {
                firstName: formValue.firstName,
                lastName: formValue.lastName,
                email: formValue.email,
                password: formValue.password,
                enabled: formValue.enabled,
                accountLocked: formValue.accountLocked,
                roleIds: formValue.roleIds
            };
            
            this.userService.create(createRequest).subscribe({
                next: () => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Sucesso',
                        detail: 'Usuário criado com sucesso'
                    });
                    this.hideDialog();
                    this.loadUsers(0);
                },
                error: (error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Erro',
                        detail: error.error?.message || 'Erro ao criar usuário'
                    });
                }
            });
        }
    }

    toggleStatus(user: User): void {
        const action = user.enabled ? 'desativar' : 'ativar';
        
        this.confirmationService.confirm({
            message: `Deseja ${action} o usuário ${user.name}?`,
            header: 'Confirmar',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sim',
            rejectLabel: 'Não',
            accept: () => {
                this.userService.toggleStatus(user.id!).subscribe({
                    next: () => {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Sucesso',
                            detail: `Usuário ${action === 'ativar' ? 'ativado' : 'desativado'} com sucesso`
                        });
                        this.loadUsers(this.currentPage);
                    },
                    error: (error) => {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Erro',
                            detail: 'Erro ao alterar status do usuário'
                        });
                    }
                });
            }
        });
    }

    toggleLock(user: User): void {
        const action = user.accountLocked ? 'desbloquear' : 'bloquear';
        
        this.confirmationService.confirm({
            message: `Deseja ${action} a conta do usuário ${user.name}?`,
            header: 'Confirmar',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sim',
            rejectLabel: 'Não',
            accept: () => {
                this.userService.toggleLock(user.id!).subscribe({
                    next: () => {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Sucesso',
                            detail: `Conta ${action === 'bloquear' ? 'bloqueada' : 'desbloqueada'} com sucesso`
                        });
                        this.loadUsers(this.currentPage);
                    },
                    error: (error) => {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Erro',
                            detail: 'Erro ao alterar bloqueio da conta'
                        });
                    }
                });
            }
        });
    }

    deleteUser(user: User): void {
        this.confirmationService.confirm({
            message: 'Esta ação não pode ser desfeita. Todos os dados associados a este usuário serão perdidos.',
            header: 'Tem certeza?',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Excluir usuário',
            rejectLabel: 'Cancelar',
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-outlined',
            accept: () => {
                this.userService.delete(user.id!).subscribe({
                    next: () => {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Sucesso',
                            detail: 'Usuário deletado com sucesso'
                        });
                        this.loadUsers(this.currentPage);
                    },
                    error: (error) => {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Erro',
                            detail: 'Erro ao deletar usuário'
                        });
                    }
                });
            }
        });
    }

    getRoleSeverity(role: string): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' {
        switch (role) {
            case 'ADMIN':
                return 'danger';
            case 'USER':
                return 'success';
            default:
                return 'info';
        }
    }

    getInitials(name: string): string {
        if (!name) return '?';
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    }

    getUserAvatarColor(name: string): string {
        const colors = [
            '#3B82F6', // blue
            '#10B981', // green
            '#F59E0B', // amber
            '#EF4444', // red
            '#8B5CF6', // violet
            '#EC4899', // pink
            '#14B8A6', // teal
            '#F97316', // orange
        ];
        
        const hash = name.split('').reduce((acc, char) => {
            return char.charCodeAt(0) + ((acc << 5) - acc);
        }, 0);
        
        return colors[Math.abs(hash) % colors.length];
    }

    formatDate(date: Date | string): string {
        if (!date) return '-';
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year} ${d.toTimeString().slice(0,5)}`;
    }

    currentMenu: MenuItem[] = [];

    getMenuItems(user: User) {
        this.currentMenu = [
            {
                label: 'Editar',
                icon: 'pi pi-pencil',
                command: () => this.editUser(user)
            },
            {
                label: user.enabled ? 'Desativar' : 'Ativar',
                icon: user.enabled ? 'pi pi-ban' : 'pi pi-check',
                command: () => this.toggleStatus(user)
            },
            {
                label: user.accountLocked ? 'Desbloquear' : 'Bloquear',
                icon: user.accountLocked ? 'pi pi-lock-open' : 'pi pi-lock',
                command: () => this.toggleLock(user)
            },
            {
                separator: true
            },
            {
                label: 'Deletar',
                icon: 'pi pi-trash',
                command: () => this.deleteUser(user),
                styleClass: 'text-red-500'
            }
        ];
    }
}