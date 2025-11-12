import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TreeTableModule } from 'primeng/treetable';
import { TreeNode } from 'primeng/api';
import { MessageService } from 'primeng/api';
import { CollectionAreaService } from '@/core/services/collection-area.service';
import { PlotService, BulkPlotImportRequest, ImportItem } from '@/core/services/plot.service';
import { CollectionArea } from '@/core/models/collection/collection-area';
import { Plot } from '@/core/models/collection/plot';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-plot-import-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    TreeTableModule
  ],
  template: `
    <div class="plot-import-dialog">
      <div class="mb-4">
        <p class="text-sm text-600">
          Selecione uma área completa ou um plot específico para importar na área atual
        </p>
      </div>

      <div class="field mb-4" *ngIf="selectedNodes.length <= 1">
        <label for="plotCode" class="block font-semibold mb-2">
          <i class="pi pi-tag mr-2"></i>Código do Plot
        </label>
        <input 
          pInputText 
          id="plotCode" 
          [(ngModel)]="plotCode"
          placeholder="Ex: PLOT-001"
          class="w-full" 
          autofocus />
        <small class="text-500">Código único para o plot importado</small>
      </div>
      
      <div class="field mb-4" *ngIf="selectedNodes.length > 1">
        <div class="bg-blue-50 border-round p-3 border-1 border-blue-200">
          <div class="flex align-items-start gap-2">
            <i class="pi pi-info-circle text-blue-600 mt-1"></i>
            <div class="text-sm text-blue-800">
              <strong>Multisseleção ativa:</strong> Os plots serão criados usando os nomes originais das áreas/plots selecionados.
            </div>
          </div>
        </div>
      </div>

      <div class="field mb-3">
        <label class="block font-semibold mb-2">
          <i class="pi pi-folder-open mr-2"></i>Selecione a Origem
        </label>
        <p-treeTable 
          [value]="treeData" 
          [loading]="loading"
          selectionMode="checkbox"
          [(selection)]="selectedNodes"
          (onNodeSelect)="onNodeSelect($event)"
          (onNodeUnselect)="onNodeUnselect($event)"
          [scrollable]="true"
          scrollHeight="380px"
          [tableStyle]="{ 'min-width': '100%' }"
          styleClass="p-treetable-sm">
          
          <ng-template pTemplate="header">
            <tr>
              <th style="width: 10%"></th>
              <th style="width: 35%">Nome</th>
              <th style="width: 20%" class="text-center">Tipo</th>
              <th style="width: 20%" class="text-right">Área (m²)</th>
              <th style="width: 15%" class="text-center">Plots</th>
            </tr>
          </ng-template>

          <ng-template pTemplate="body" let-rowNode let-rowData="rowData">
            <tr [ttRow]="rowNode" [ttSelectableRow]="rowNode">
              <td style="width: 10%">
                <p-treeTableCheckbox [value]="rowNode"></p-treeTableCheckbox>
              </td>
              <td style="width: 35%">
                <p-treeTableToggler [rowNode]="rowNode"></p-treeTableToggler>
                <span class="ml-2 font-medium">{{ rowData.name }}</span>
              </td>
              <td style="width: 20%" class="text-center">
                <span class="inline-flex align-items-center justify-content-center gap-1 px-2 py-1 border-round"
                      [class.bg-blue-100]="rowData.type === 'area'"
                      [class.text-blue-700]="rowData.type === 'area'"
                      [class.bg-green-100]="rowData.type === 'plot'"
                      [class.text-green-700]="rowData.type === 'plot'">
                  <span class="material-symbols-outlined" [style.font-size]="'16px'">
                    {{ rowData.type === 'area' ? 'landscape' : 'grid_on' }}
                  </span>
                  <span class="text-xs font-semibold">
                    {{ rowData.type === 'area' ? 'Área' : 'Plot' }}
                  </span>
                </span>
              </td>
              <td style="width: 20%" class="text-right">
                <span *ngIf="rowData.area" class="text-sm font-medium">
                  {{ rowData.area | number:'1.2-2' }}
                </span>
                <span *ngIf="!rowData.area" class="text-sm text-400">-</span>
              </td>
              <td style="width: 15%" class="text-center">
                <span *ngIf="rowData.type === 'area'" class="text-sm text-600">
                  {{ rowData.plotCount || 0 }}
                </span>
                <span *ngIf="rowData.type !== 'area'" class="text-sm text-400">-</span>
              </td>
            </tr>
          </ng-template>

          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="4" class="text-center p-4">
                <div class="flex flex-column align-items-center gap-2 py-3">
                  <i class="pi pi-inbox text-4xl text-400"></i>
                  <span class="text-500 font-medium">Nenhuma área disponível para importação</span>
                </div>
              </td>
            </tr>
          </ng-template>
        </p-treeTable>
      </div>

      <div *ngIf="selectedNodes.length > 0" 
           class="bg-blue-50 border-round p-3 mb-3 border-1 border-blue-200">
        <div class="flex align-items-start gap-2">
          <i class="pi pi-info-circle text-blue-600 mt-1"></i>
          <div class="flex-1">
            <div class="font-semibold text-blue-900 mb-2">
              {{selectedNodes.length}} {{selectedNodes.length === 1 ? 'item selecionado' : 'itens selecionados'}}
            </div>
            <div class="text-sm text-blue-800 max-h-10rem overflow-y-auto">
              <div *ngFor="let node of selectedNodes; let i = index" class="mb-1">
                <strong>{{ getPlotCodeForNode(node, i) }}</strong>
                <span class="mx-2">←</span>
                <span>{{ node.data.name }}</span>
                <span class="text-500 ml-1">
                  ({{ node.data.type === 'area' ? 
                      (node.data.plotCount || 0) + ' plots' : 
                      (node.data.area | number:'1.2-2') + ' m²' }})
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex justify-content-end gap-2 pt-3 border-top-1 surface-border">
        <p-button 
          label="Cancelar" 
          severity="secondary"
          icon="pi pi-times"
          (onClick)="cancel()" />
        <p-button 
          [label]="selectedNodes.length > 1 ? 'Importar ' + selectedNodes.length + ' Plots' : 'Importar Plot'" 
          icon="pi pi-download"
          (onClick)="import()"
          [disabled]="!canImport()" />
      </div>
    </div>
  `,
  styles: [`
    .plot-import-dialog {
      padding: 0.5rem;
    }

    :host ::ng-deep {
      .p-treetable {
        .p-treetable-thead > tr > th {
          background: var(--surface-50);
          padding: 0.75rem 1rem;
          font-weight: 600;
          font-size: 0.875rem;
          border-bottom: 2px solid var(--surface-200);
        }

        .p-treetable-tbody > tr {
          transition: background-color 0.2s;
        }

        .p-treetable-tbody > tr.selected-row {
          background: var(--primary-50) !important;
        }

        .p-treetable-tbody > tr > td {
          padding: 0.875rem 1rem;
          border-bottom: 1px solid var(--surface-100);
          vertical-align: middle;
        }

        .p-treetable-toggler {
          width: 2rem;
          height: 2rem;
          margin-right: 0.25rem;
        }

        .p-treetable-tbody > tr:hover {
          background: var(--surface-50);
        }
      }

      .material-symbols-outlined {
        font-variation-settings:
          'FILL' 0,
          'wght' 300,
          'GRAD' 0,
          'opsz' 20;
      }

      .p-button {
        padding: 0.625rem 1.25rem;
      }

      .p-inputtext {
        padding: 0.625rem 0.875rem;
      }
    }
  `]
})
export class PlotImportDialogComponent implements OnInit {
  private collectionAreaService = inject(CollectionAreaService);
  private plotService = inject(PlotService);
  private messageService = inject(MessageService);
  private config = inject(DynamicDialogConfig);
  private ref = inject(DynamicDialogRef);

  targetAreaId!: number;
  plotCode = '';
  
  treeData: TreeNode[] = [];
  selectedNodes: TreeNode[] = [];
  loading = false;

  ngOnInit() {
    this.targetAreaId = this.config.data.targetAreaId;
    this.loadTreeData();
  }

  loadTreeData() {
    this.loading = true;
    
    // Carregar todas as áreas
    this.collectionAreaService.search(0, 1000).subscribe({
      next: (page) => {
        const areas = page.content.filter(a => a.id !== this.targetAreaId);
        
        // Para cada área, carregar seus plots
        const plotRequests = areas.map(area => 
          this.plotService.searchByArea(area.id!, 0, 1000)
        );

        forkJoin(plotRequests).subscribe({
          next: (plotPages) => {
            this.treeData = areas.map((area, index) => {
              const plots = plotPages[index].content;
              
              return {
                data: {
                  id: area.id,
                  name: area.name,
                  type: 'area',
                  area: null,
                  plotCount: plots.length
                },
                children: plots.map(plot => ({
                  data: {
                    id: plot.id,
                    areaId: area.id,
                    name: plot.plotCode,
                    type: 'plot',
                    area: plot.areaM2,
                    plotData: plot
                  }
                })),
                expanded: false
              } as TreeNode;
            });
            
            this.loading = false;
          },
          error: (error) => {
            console.error('Error loading plots:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Erro',
              detail: 'Erro ao carregar plots das áreas'
            });
            this.loading = false;
          }
        });
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Erro ao carregar áreas disponíveis'
        });
        console.error('Error loading areas:', error);
        this.loading = false;
      }
    });
  }

  canImport(): boolean {
    if (this.selectedNodes.length === 0) {
      return false;
    }
    
    // Se tiver apenas 1 selecionado, exige código
    if (this.selectedNodes.length === 1) {
      const hasCode = !!(this.plotCode && this.plotCode.trim().length > 0);
      console.log('canImport check (single):', { 
        hasCode, 
        plotCode: this.plotCode, 
        selectedCount: this.selectedNodes.length 
      });
      return hasCode;
    }
    
    // Se tiver múltiplos, não precisa código (usa os nomes originais)
    console.log('canImport check (multiple):', { 
      selectedCount: this.selectedNodes.length 
    });
    return true;
  }

  onNodeSelect(event: any) {
    console.log('Node selected:', event);
    console.log('Selected nodes count:', this.selectedNodes.length);
    console.log('Selected nodes:', this.selectedNodes.map(n => n.data.name));
  }

  onNodeUnselect(event: any) {
    console.log('Node unselected:', event);
    console.log('Selected nodes count:', this.selectedNodes.length);
  }

  getPlotCodeForNode(node: TreeNode, index: number): string {
    // Se tiver múltiplas seleções, usa o nome original
    if (this.selectedNodes.length > 1) {
      return node.data.name;
    }
    // Se tiver apenas uma seleção, usa o código digitado
    return this.plotCode || node.data.name;
  }

  import() {
    if (!this.canImport()) return;

    const items = this.selectedNodes.map((node, index) => {
      const nodeData = node.data;
      const item: any = {
        importType: nodeData.type === 'area' ? 'AREA' as const : 'PLOT' as const,
        // Se múltiplas seleções, usa o nome original. Se única, usa o código digitado
        plotCode: this.selectedNodes.length > 1 ? nodeData.name : this.plotCode.trim()
      };

      if (nodeData.type === 'area') {
        item.sourceAreaId = nodeData.id;
      } else {
        item.sourceAreaId = nodeData.areaId;
        item.sourcePlotId = nodeData.id;
      }

      return item;
    });

    const bulkRequest: BulkPlotImportRequest = {
      targetAreaId: this.targetAreaId,
      items: items
    };

    this.plotService.importPlots(bulkRequest).subscribe({
      next: (plots) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Sucesso',
          detail: `${plots.length} ${plots.length === 1 ? 'plot importado' : 'plots importados'} com sucesso`
        });
        this.ref.close(plots);
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: error.error?.message || 'Erro ao importar plots'
        });
        console.error('Error importing plots:', error);
      }
    });
  }

  cancel() {
    this.ref.close();
  }
}
