import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { SelectModule } from 'primeng/select';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { SplitButtonModule } from 'primeng/splitbutton';
import { ConfirmationService, MessageService } from 'primeng/api';

import { AuditLogService } from '@/core/services/audit-log.service';
import { AuditLog, AuditAction } from '@/core/models/audit/audit-log';
import { AvatarModule } from 'primeng/avatar';

@Component({
    selector: 'app-audit-logs',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TableModule,
        ButtonModule,
        TagModule,
        CardModule,
        SelectModule,
        IconFieldModule,
        InputIconModule,
        InputTextModule,
        DialogModule,
        AvatarModule,
        ConfirmDialogModule,
        ToastModule,
        SplitButtonModule
    ],
    providers: [ConfirmationService, MessageService],
    templateUrl: './audit-logs.component.html',
    styleUrls: ['./audit-logs.component.scss']
})
export class AuditLogsComponent implements OnInit {
    auditLogs: AuditLog[] = [];
    totalRecords = 0;
    loading = false;
    
    // Pagination
    currentPage = 0;
    pageSize = 20;
    
    // Filters
    selectedAction: AuditAction | null = null;
    searchTerm = '';
    
    // Dialog
    detailDialog = false;
    selectedLog?: AuditLog;
    
    // Selection
    selectedLogs: AuditLog[] = [];
    
    // Actions dropdown
    actions = [
        { label: 'Todas as Ações', value: null },
        { label: 'Criar', value: AuditAction.CREATE },
        { label: 'Atualizar', value: AuditAction.UPDATE },
        { label: 'Excluir', value: AuditAction.DELETE },
        { label: 'Login', value: AuditAction.LOGIN },
        { label: 'Logout', value: AuditAction.LOGOUT },
        { label: 'Alterar Status', value: AuditAction.STATUS_CHANGE },
        { label: 'Alterar Bloqueio', value: AuditAction.LOCK_CHANGE },
        { label: 'Alterar Senha', value: AuditAction.PASSWORD_CHANGE }
    ];

    exportMenuItems = [
        {
            label: 'CSV',
            icon: 'pi pi-file',
            command: () => this.exportLogs('csv')
        },
        {
            label: 'Excel',
            icon: 'pi pi-file-excel',
            command: () => this.exportLogs('excel')
        },
        {
            label: 'JSON',
            icon: 'pi pi-code',
            command: () => this.exportLogs('json')
        },
        {
            label: 'TXT',
            icon: 'pi pi-file-edit',
            command: () => this.exportLogs('txt')
        }
    ];

    constructor(
        private auditLogService: AuditLogService,
        private confirmationService: ConfirmationService,
        private messageService: MessageService
    ) {}

    ngOnInit() {
        this.loadAuditLogs();
    }

    loadAuditLogs() {
        this.loading = true;
        
        if (this.selectedAction) {
            this.auditLogService.getAuditLogsByAction(this.selectedAction, this.currentPage, this.pageSize)
                .subscribe({
                    next: (response) => {
                        this.auditLogs = response.content;
                        this.totalRecords = response.totalElements;
                        this.loading = false;
                    },
                    error: (error) => {
                        console.error('Error loading audit logs:', error);
                        this.loading = false;
                    }
                });
        } else {
            this.auditLogService.getAuditLogs(this.currentPage, this.pageSize)
                .subscribe({
                    next: (response) => {
                        this.auditLogs = response.content;
                        this.totalRecords = response.totalElements;
                        this.loading = false;
                    },
                    error: (error) => {
                        console.error('Error loading audit logs:', error);
                        this.loading = false;
                    }
                });
        }
    }

    onPageChange(event: any) {
        this.currentPage = event.page;
        this.pageSize = event.rows;
        this.loadAuditLogs();
    }

    onActionFilter() {
        this.currentPage = 0;
        this.loadAuditLogs();
    }

    showDetails(log: AuditLog) {
        this.selectedLog = log;
        this.detailDialog = true;
    }

    getActionSeverity(action: AuditAction): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
        switch (action) {
            case AuditAction.CREATE:
                return 'success';
            case AuditAction.UPDATE:
                return 'info';
            case AuditAction.DELETE:
                return 'danger';
            case AuditAction.LOGIN:
                return 'contrast';
            case AuditAction.STATUS_CHANGE:
            case AuditAction.LOCK_CHANGE:
                return 'warn';
            default:
                return 'secondary';
        }
    }

    getActionLabel(action: AuditAction): string {
        const labels: Record<AuditAction, string> = {
            [AuditAction.CREATE]: 'Criar',
            [AuditAction.UPDATE]: 'Atualizar',
            [AuditAction.DELETE]: 'Excluir',
            [AuditAction.LOGIN]: 'Login',
            [AuditAction.LOGOUT]: 'Logout',
            [AuditAction.STATUS_CHANGE]: 'Alterar Status',
            [AuditAction.LOCK_CHANGE]: 'Alterar Bloqueio',
            [AuditAction.PASSWORD_CHANGE]: 'Alterar Senha'
        };
        return labels[action];
    }

    formatDate(date: Date | string): string {
        if (!date) return '-';
        const d = new Date(date);
        return d.toLocaleString('pt-BR');
    }

    formatJson(json: string): string {
        if (!json) return '-';
        try {
            return JSON.stringify(JSON.parse(json), null, 2);
        } catch {
            return json;
        }
    }

    getEntityIcon(entityName: string): string {
        const icons: Record<string, string> = {
            'User': 'pi-user',
            'CollectionArea': 'pi-map-marker',
            'SpecimenObject': 'pi-sitemap',
            'Plot': 'pi-th-large',
            'Species': 'pi-leaf'
        };
        return icons[entityName] || 'pi-circle';
    }

    getInitials(name: string): string {
        if (!name) return '?';
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    }

    getBrowserFromUserAgent(userAgent: string | undefined): string {
        if (!userAgent) return '-';
        
        if (userAgent.includes('Chrome')) return 'Chrome';
        if (userAgent.includes('Firefox')) return 'Mozilla';
        if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
        if (userAgent.includes('Edge')) return 'Edge';
        if (userAgent.includes('Opera')) return 'Opera';
        
        return 'Other';
    }

    previousPage() {
        if (this.currentPage > 0) {
            this.currentPage--;
            this.loadAuditLogs();
        }
    }

    nextPage() {
        if ((this.currentPage + 1) * this.pageSize < this.totalRecords) {
            this.currentPage++;
            this.loadAuditLogs();
        }
    }

    getUserAvatarColor(name?: string): string {
        if (!name) return '#6b7280'; // cor padrão se não houver nome
        
        // Array de cores harmoniosas para avatares
        const colors = [
        '#ef4444', // red-500
        '#f97316', // orange-500
        '#eab308', // yellow-500
        '#22c55e', // green-500
        '#10b981', // emerald-500
        '#06b6d4', // cyan-500
        '#3b82f6', // blue-500
        '#6366f1', // indigo-500
        '#8b5cf6', // violet-500
        '#a855f7', // purple-500
        '#ec4899', // pink-500
        '#f43f5e', // rose-500
        ];
        
        // Gerar um hash simples do nome
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        // Usar o hash para selecionar uma cor
        const index = Math.abs(hash) % colors.length;
        return colors[index];
    }

    get Math() {
        return Math;
    }

    exportLogs(format: 'csv' | 'excel' | 'json' | 'txt') {
        const dataToExport = this.selectedLogs.length > 0 ? this.selectedLogs : this.auditLogs;
        
        if (dataToExport.length === 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Atenção',
                detail: 'Nenhum log disponível para exportar',
                life: 3000
            });
            return;
        }

        switch (format) {
            case 'csv':
                this.exportAsCSV(dataToExport);
                break;
            case 'excel':
                this.exportAsExcel(dataToExport);
                break;
            case 'json':
                this.exportAsJSON(dataToExport);
                break;
            case 'txt':
                this.exportAsTXT(dataToExport);
                break;
        }

        this.messageService.add({
            severity: 'success',
            summary: 'Sucesso',
            detail: `${dataToExport.length} log(s) exportado(s) em formato ${format.toUpperCase()}`,
            life: 3000
        });
    }

    private exportAsCSV(data: AuditLog[]) {
        const headers = ['ID', 'Ação', 'Entidade', 'ID Entidade', 'Usuário', 'Email', 'Descrição', 'IP', 'Navegador', 'Data/Hora'];
        const csvContent = [
            headers.join(','),
            ...data.map(log => [
                log.id,
                log.action,
                log.entityName,
                log.entityId,
                `"${log.userName || '-'}"`,
                `"${log.userEmail || '-'}"`,
                `"${log.description || '-'}"`,
                log.ipAddress || '-',
                `"${log.userAgent || '-'}"`,
                this.formatDate(log.timestamp)
            ].join(','))
        ].join('\n');

        this.downloadFile(csvContent, 'audit-logs.csv', 'text/csv');
    }

    private exportAsExcel(data: AuditLog[]) {
        // Simula formato Excel com TSV (Tab Separated Values)
        const headers = ['ID', 'Ação', 'Entidade', 'ID Entidade', 'Usuário', 'Email', 'Descrição', 'IP', 'Navegador', 'Data/Hora'];
        const tsvContent = [
            headers.join('\t'),
            ...data.map(log => [
                log.id,
                log.action,
                log.entityName,
                log.entityId,
                log.userName || '-',
                log.userEmail || '-',
                log.description || '-',
                log.ipAddress || '-',
                log.userAgent || '-',
                this.formatDate(log.timestamp)
            ].join('\t'))
        ].join('\n');

        this.downloadFile(tsvContent, 'audit-logs.xls', 'application/vnd.ms-excel');
    }

    private exportAsJSON(data: AuditLog[]) {
        const jsonContent = JSON.stringify(data, null, 2);
        this.downloadFile(jsonContent, 'audit-logs.json', 'application/json');
    }

    private exportAsTXT(data: AuditLog[]) {
        const txtContent = data.map(log => 
            `===============================================\n` +
            `ID: ${log.id}\n` +
            `Ação: ${this.getActionLabel(log.action)}\n` +
            `Entidade: ${log.entityName} #${log.entityId}\n` +
            `Usuário: ${log.userName || 'Sistema'} (${log.userEmail || '-'})\n` +
            `Descrição: ${log.description || '-'}\n` +
            `IP: ${log.ipAddress || '-'}\n` +
            `Navegador: ${this.getBrowserFromUserAgent(log.userAgent)}\n` +
            `Data/Hora: ${this.formatDate(log.timestamp)}\n` +
            `===============================================\n`
        ).join('\n');

        this.downloadFile(txtContent, 'audit-logs.txt', 'text/plain');
    }

    private downloadFile(content: string, filename: string, mimeType: string) {
        const blob = new Blob([content], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        window.URL.revokeObjectURL(url);
    }

    deleteLog(log: AuditLog) {
        this.confirmationService.confirm({
            message: 'Tem certeza que deseja excluir este log?',
            header: 'Confirmar Exclusão',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sim',
            rejectLabel: 'Não',
            accept: () => {
                this.auditLogService.deleteAuditLog(log.id).subscribe({
                    next: () => {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Sucesso',
                            detail: 'Log excluído com sucesso',
                            life: 3000
                        });
                        this.loadAuditLogs();
                    },
                    error: (error) => {
                        console.error('Error deleting audit log:', error);
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Erro',
                            detail: 'Erro ao excluir log',
                            life: 3000
                        });
                    }
                });
            }
        });
    }

    deleteSelectedLogs() {
        if (this.selectedLogs.length === 0) {
            this.confirmationService.confirm({
                message: 'Selecione pelo menos um log para excluir',
                header: 'Atenção',
                icon: 'pi pi-info-circle',
                rejectVisible: false,
                acceptLabel: 'OK'
            });
            return;
        }

        this.confirmationService.confirm({
            message: `Tem certeza que deseja excluir ${this.selectedLogs.length} log(s)?`,
            header: 'Confirmar Exclusão',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sim',
            rejectLabel: 'Não',
            accept: () => {
                const ids = this.selectedLogs.map(log => log.id);
                this.auditLogService.deleteAuditLogs(ids).subscribe({
                    next: () => {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Sucesso',
                            detail: `${this.selectedLogs.length} log(s) excluído(s) com sucesso`,
                            life: 3000
                        });
                        this.selectedLogs = [];
                        this.loadAuditLogs();
                    },
                    error: (error) => {
                        console.error('Error deleting audit logs:', error);
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Erro',
                            detail: 'Erro ao excluir logs',
                            life: 3000
                        });
                    }
                });
            }
        });
    }
}
