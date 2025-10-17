import { Component, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { RippleModule } from 'primeng/ripple';
import { AppFloatingConfigurator } from '../../../layout/component/app.floatingconfigurator';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { PasswordModule } from 'primeng/password';
import { StyleClass } from "primeng/styleclass";
import { AuthService } from '@/core/services/auth.service';
import { MessageModule } from 'primeng/message';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [
        ButtonModule,
        CheckboxModule,
        InputTextModule,
        FormsModule,
        ReactiveFormsModule,
        CommonModule,
        RouterModule,
        RippleModule,
        AppFloatingConfigurator,
        FloatLabelModule,
        InputIconModule,
        IconFieldModule,
        PasswordModule,
        MessageModule
    ],
    templateUrl: './register.html',
    styleUrls: ['./register.scss']
})
export class Register {

    form: FormGroup;
    isLoading = false;

    constructor(
        private authService: AuthService,
        private router: Router,
        private fb: FormBuilder
    ){
        this.form = fb.group({
            firstName: [null, [Validators.required]],
            lastName: [null, [Validators.required]],
            email: [null, [Validators.required, Validators.email]],
            password: [null, [Validators.required]],
            confirmPassword: [null, [Validators.required, (control: FormControl) => this.validateSamePassword(control)]],
        });
    }

    messages = signal<any[]>([]);
    addMessage(message: any) {
        this.messages.set([message]);
    }
    clearMessages() {
        this.messages.set([]);
    }

    validateSamePassword(control: FormControl) {
        if (this.form) {
            const password = this.form.get('password')?.value;
            const confirmPassword = control.value;
            
            if (password !== confirmPassword) {
            return { passwordMismatch: true };
            }
        }
        return null;
    }

    doRegister(){
        this.isLoading = true;
        this.authService.register({
            email: this.form.get('email')?.value, 
            password: this.form.get('password')?.value,
            firstName: this.form.get('firstName')?.value,
            lastName: this.form.get('lastName')?.value,
        }).subscribe({
            next: () => {
                this.router.navigate(['/']);
            },
            error: () => {
                setTimeout(() => {
                    this.addMessage({
                        severity: 'error',
                        content: 'Usuário e/ou senha inválidos',
                    });
                    this.isLoading = false;
                }, 1000)

            }
        });
    }
}
