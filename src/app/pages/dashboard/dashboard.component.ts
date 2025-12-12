import { AuthService } from "@/core/services/auth.service";
import { DashboardService } from "@/core/services/dashboard.service";
import { DashboardStatistics } from "@/core/models/dashboard";
import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import {CardModule} from 'primeng/card'
import {ChartModule} from 'primeng/chart'
import {ButtonModule} from 'primeng/button'
import { SharedModule } from "@/shared/shared.module";
import { GlobeComponent } from "@/shared/components/globe/globe.component";
import { MapViewComponent } from "../map/map-viewer/map-view.component";

@Component({
    templateUrl: './dashboard.component.html',
    standalone: true,
    imports: [CommonModule, CardModule, ChartModule, ButtonModule, SharedModule, MapViewComponent]
})
export class DashboardComponent implements OnInit {

    stats: any[] = [];
    speciesData: any;
    speciesChartOptions: any;
    recentActivities: any[] = [];
    suggestions: any[] = [];
    lastUpdate: string = "";
    loading: boolean = true;

    constructor(
        private authService: AuthService,
        private dashboardService: DashboardService
    ) { }

    get username() {
        return this.authService.getName() ?? "Usuário(a)";
    }

    ngOnInit(): void {
        this.lastUpdate = new Date().toLocaleString('pt-BR');
        this.loadDashboardData();
    }

    loadDashboardData(): void {
        this.loading = true;
        this.dashboardService.getStatistics().subscribe({
            next: (data: DashboardStatistics) => {
                this.updateStats(data);
                this.updateSpeciesChart(data);
                this.updateRecentActivities(data);
                this.updateSuggestions(data);
                this.loading = false;
            },
            error: (error) => {
                console.error('Erro ao carregar dados do dashboard:', error);
                this.loading = false;
                
                this.loadFallbackData();
            }
        });
    }

    updateStats(data: DashboardStatistics): void {
        this.stats = [
            {
                title: 'Total de Espécimes',
                value: data.totalSpecimens.toString(),
                change: `+${data.recentSpecimens}`,
                changeType: 'positive',
                materialIcon: 'potted_plant',
                color: 'bg-emerald-500'
            },
            {
                title: 'Espécies Diferentes',
                value: data.totalSpecies.toString(),
                change: `${data.topSpecies.length} principais`,
                changeType: 'neutral',
                materialIcon: 'eco',
                color: 'bg-green-500'
            },
            {
                title: 'Áreas de Coleta',
                value: data.totalCollectionAreas.toString(),
                change: 'Cadastradas',
                changeType: 'neutral',
                materialIcon: 'map',
                color: 'bg-blue-500'
            },
            {
                title: 'Registros Recentes',
                value: data.recentSpecimens.toString(),
                change: 'Últimos 7 dias',
                changeType: 'positive',
                materialIcon: 'calendar_today',
                color: 'bg-purple-500'
            },
        ];
    }

    updateSpeciesChart(data: DashboardStatistics): void {
        const labels = data.topSpecies.map(s => s.speciesName);
        const counts = data.topSpecies.map(s => s.count);

        this.speciesData = {
            labels: labels,
            datasets: [
                {
                    label: 'Quantidade de Espécimes',
                    backgroundColor: '#42A5F5',
                    data: counts
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
    }

    updateRecentActivities(data: DashboardStatistics): void {
        this.recentActivities = data.recentActivities;
    }

    updateSuggestions(data: DashboardStatistics): void {
        this.suggestions = [];

        
        if (data.topSpecies.length > 0) {
            const topSpecies = data.topSpecies[0];
            this.suggestions.push({
                type: 'highlight',
                title: 'Espécie em Destaque',
                content: `${topSpecies.speciesName} tem ${topSpecies.count} espécimes registrados`,
                icon: 'pi pi-star-fill',
                color: 'text-yellow-600'
            });
        }

        
        if (data.recentSpecimens > 0) {
            this.suggestions.push({
                type: 'activity',
                title: 'Atividade Recente',
                content: `${data.recentSpecimens} novos espécimes nos últimos 7 dias`,
                icon: 'pi pi-chart-line',
                color: 'text-blue-600'
            });
        }

        
        if (data.totalSpecies > 0 && data.totalSpecimens > 0) {
            const diversity = (data.totalSpecies / data.totalSpecimens * 100).toFixed(1);
            this.suggestions.push({
                type: 'info',
                title: 'Índice de Diversidade',
                content: `${diversity}% de diversidade de espécies no inventário`,
                icon: 'pi pi-info-circle',
                color: 'text-green-600'
            });
        }
    }

    getFromId(allSpecimens: any[], id: number): any {
        return allSpecimens.find(specimen => specimen.id === id);
    }

    loadFallbackData(): void {
        
        this.stats = [
            {
                title: 'Total de Espécimes',
                value: '-',
                change: 'Carregando...',
                changeType: 'neutral',
                materialIcon: 'potted_plant',
                color: 'bg-emerald-500'
            },
            {
                title: 'Espécies Diferentes',
                value: '-',
                change: 'Carregando...',
                changeType: 'neutral',
                materialIcon: 'eco',
                color: 'bg-green-500'
            },
            {
                title: 'Áreas de Coleta',
                value: '-',
                change: 'Carregando...',
                changeType: 'neutral',
                materialIcon: 'map',
                color: 'bg-blue-500'
            },
            {
                title: 'Registros Recentes',
                value: '-',
                change: 'Últimos 7 dias',
                changeType: 'neutral',
                materialIcon: 'calendar_today',
                color: 'bg-purple-500'
            },
        ];

        this.speciesData = {
            labels: ['Nenhum dado disponível'],
            datasets: [
                {
                    label: 'Quantidade de Espécimes',
                    backgroundColor: '#42A5F5',
                    data: [0]
                }
            ]
        };

        this.recentActivities = [];
        this.suggestions = [
            {
                type: 'info',
                title: 'Sem dados',
                content: 'Não foi possível carregar os dados do dashboard',
                icon: 'pi pi-info-circle',
                color: 'text-gray-600'
            }
        ];
    }
}