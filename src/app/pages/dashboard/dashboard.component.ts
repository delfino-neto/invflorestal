import { AuthService } from "@/core/services/auth.service";
import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import {CardModule} from 'primeng/card'
import {ChartModule} from 'primeng/chart'
import {ButtonModule} from 'primeng/button'
import { SharedModule } from "@/shared/shared.module";
import { GlobeComponent } from "@/shared/components/globe/globe.component";

@Component({
    templateUrl: './dashboard.component.html',
    standalone: true,
    imports: [CommonModule, CardModule, ChartModule, ButtonModule, SharedModule]
})
export class DashboardComponent implements OnInit {

    stats: any[] = [];
    speciesData: any;
    speciesChartOptions: any;
    recentActivities: any[] = [];
    suggestions: any[] = [];
    lastUpdate: string = "";

    constructor(private authService: AuthService) { }

    get username() {
        return this.authService.getName() ?? "Usuário(a)";
    }

    ngOnInit(): void {
        this.lastUpdate = new Date().toLocaleString('pt-BR');

        this.stats = [
            {
                title: 'Total de Árvores',
                value: '2,847',
                change: '+12%',
                changeType: 'positive',
                materialIcon: 'nature',
                color: 'bg-emerald-500'
            },
            {
                title: 'Espécies Diferentes',
                value: '156',
                change: '+3',
                changeType: 'positive',
                materialIcon: 'eco',
                color: 'bg-green-500'
            },
            {
                title: 'Registros Recentes',
                value: '89',
                change: 'Últimos 7 dias',
                changeType: 'neutral',
                materialIcon: 'calendar_today',
                color: 'bg-blue-500'
            },
            {
                title: 'Taxa de Crescimento',
                value: '94.2%',
                change: '+2.1%',
                changeType: 'positive',
                materialIcon: 'monitoring',
                color: 'bg-purple-500'
            },
        ];

        this.speciesData = {
            labels: ['Pau-brasil', 'Ipê Amarelo', 'Cedro', 'Jatobá', 'Outros'],
            datasets: [
                {
                    label: 'Quantidade de Árvores',
                    backgroundColor: '#42A5F5',
                    data: [342, 298, 256, 189, 1762]
                }
            ]
        };

        this.speciesChartOptions = {
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: '#495057'
                    },
                    grid: {
                        color: '#ebedef'
                    }
                },
                y: {
                    ticks: {
                        color: '#495057'
                    },
                    grid: {
                        color: '#ebedef'
                    }
                }
            }
        };

        this.recentActivities = [
            { id: 1, action: 'Nova espécie cadastrada', species: 'Pau-ferro', time: '2 horas atrás', user: 'João Silva' },
            { id: 2, action: 'Upload de fotos', species: 'Ipê Roxo', time: '4 horas atrás', user: 'Maria Santos' },
            { id: 3, action: 'Atualização de dados', species: 'Jequitibá', time: '6 horas atrás', user: 'Pedro Costa' },
        ];

        this.suggestions = [
            {
                type: 'highlight',
                title: 'Espécie em Destaque',
                content: 'Pau-brasil teve 23 novos registros esta semana',
                icon: 'pi pi-star-fill',
                color: 'text-yellow-600'
            },
            {
                type: 'alert',
                title: 'Alerta de Inconsistência',
                content: '5 registros precisam de verificação de coordenadas',
                icon: 'pi pi-exclamation-triangle',
                color: 'text-red-600'
            },
            {
                type: 'activity',
                title: 'Atividade Recente',
                content: '12 usuários ativos nas últimas 24 horas',
                icon: 'pi pi-users',
                color: 'text-blue-600'
            },
        ];
    }
}