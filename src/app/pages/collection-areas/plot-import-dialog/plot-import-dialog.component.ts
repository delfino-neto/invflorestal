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
  templateUrl: './plot-import-dialog.component.html',
  styleUrls: ['./plot-import-dialog.component.scss']
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
                  },
                  selectable: true
                })),
                expanded: false,
                selectable: true
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
    
    setTimeout(() => {
      const selectedNode = event.node;
      
      // Se selecionou um PARENT (área)
      if (selectedNode.children && selectedNode.children.length > 0) {
        console.log('Selected a PARENT node with', selectedNode.children.length, 'children');
        
        // Remove todos os filhos da seleção
        this.selectedNodes = this.selectedNodes.filter(node => {
          return !this.isChildOf(node, selectedNode);
        });
        
        // Desabilita os filhos
        selectedNode.children.forEach((child: TreeNode, idx: number) => {
          console.log(`Disabling child ${idx}:`, child.data.name);
          child.selectable = false;
        });
        
        console.log('Selected PARENT - removed and disabled children. Selected nodes:', this.selectedNodes.map(n => n.data.name));
      } 
      // Se selecionou um FILHO (plot)
      else {
        console.log('Selected a CHILD node');
        
        // Remove o parent da seleção (se estiver selecionado)
        const parent = this.findParentNode(selectedNode);
        if (parent) {
          console.log('Found parent:', parent.data.name);
          this.selectedNodes = this.selectedNodes.filter(node => node !== parent);
          
          // Desabilita o parent
          parent.selectable = false;
          console.log('Disabled parent:', parent.data.name);
          
          console.log('Selected CHILD - removed and disabled parent. Selected nodes:', this.selectedNodes.map(n => n.data.name));
        }
      }
      
      console.log('Final selected nodes count:', this.selectedNodes.length);
    }, 0);
  }

  onNodeUnselect(event: any) {
    console.log('Node unselected:', event);
    
    setTimeout(() => {
      const unselectedNode = event.node;
      
      // Se desselecionou um PARENT (área)
      if (unselectedNode.children && unselectedNode.children.length > 0) {
        // Reabilita os filhos
        unselectedNode.children.forEach((child: TreeNode) => {
          child.selectable = true;
        });
        console.log('Unselected PARENT - re-enabled children');
      } 
      // Se desselecionou um FILHO (plot)
      else {
        // Verifica se é o último filho selecionado
        const parent = this.findParentNode(unselectedNode);
        if (parent) {
          // Verifica se ainda há filhos deste parent selecionados
          const hasOtherChildrenSelected = parent.children?.some((child: TreeNode) => 
            this.selectedNodes.includes(child) && child !== unselectedNode
          );
          
          // Se não há mais filhos selecionados, reabilita o parent
          if (!hasOtherChildrenSelected) {
            parent.selectable = true;
            console.log('Unselected last CHILD - re-enabled parent');
          }
        }
      }
      
      console.log('Selected nodes count:', this.selectedNodes.length);
    }, 0);
  }

  // Verifica se um nó é filho de outro
  private isChildOf(node: TreeNode, potentialParent: TreeNode): boolean {
    if (!potentialParent.children) return false;
    return potentialParent.children.some(child => child === node);
  }

  // Encontra o parent de um nó
  private findParentNode(childNode: TreeNode): TreeNode | null {
    for (const node of this.treeData) {
      if (node.children && node.children.some(child => child === childNode)) {
        return node;
      }
    }
    return null;
  }

  isCheckboxDisabled(node: TreeNode): boolean {
    return node.selectable === false;
  }

  isNodeSelectable(node: any): boolean {
    return node.node.selectable !== false;
  }

  getPlotCodeForNode(node: TreeNode, index: number): string {
    if (this.selectedNodes.length > 1) {
      return node.data.name;
    }
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
