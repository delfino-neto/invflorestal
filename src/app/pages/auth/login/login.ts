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
import { AuthService } from '@/core/services/auth.service';
import { CommonModule } from '@angular/common';
import { Message, MessageModule } from 'primeng/message';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [
        CommonModule,
        ButtonModule,
        CheckboxModule,
        InputTextModule,
        FormsModule,
        RouterModule,
        RippleModule,
        AppFloatingConfigurator,
        FloatLabelModule,
        InputIconModule,
        IconFieldModule,
        PasswordModule,
        MessageModule,
        FormsModule,
        ReactiveFormsModule,
    ],
    templateUrl: './login.html',
    styleUrls: ['./login.scss']
})
export class Login {

    isLoginLoading: boolean = false;
    form: FormGroup;

    constructor(
        private authService: AuthService,
        private router: Router,
        private fb: FormBuilder
    ){
        this.form = fb.group({
            email: [null, [Validators.required]],
            password: [null, [Validators.required]],
        })
    }

    messages = signal<any[]>([]);

    addMessage(message: any) {
        this.messages.set([message]);
    }

    clearMessages() {
        this.messages.set([]);
    }

    doLogin(){
        this.isLoginLoading = true;
        this.authService.login({ email: this.form.get('email')?.value, password: this.form.get('password')?.value })
        .then(async () => {
            await this.authService.loadCurrentUser();
            this.router.navigate(['/']);
        }).catch(() => {
            setTimeout(() => {
                this.addMessage({
                    severity: 'error',
                    content: 'Usuário e/ou senha inválidos',
                });
                this.isLoginLoading = false;
            }, 1000)
        });
    }
}
