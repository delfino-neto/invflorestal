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
    
    this.collectionAreaService.search(0, 1000).subscribe({
      next: (page) => {
        const areas = page.content.filter(a => a.id !== this.targetAreaId);
        
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
    
    if (this.selectedNodes.length === 1) {
      return !!(this.plotCode && this.plotCode.trim().length > 0);
    }
    
    return true;
  }

  onNodeSelect(event: any) {
    setTimeout(() => {
      const selectedNode = event.node;
      
      if (selectedNode.children && selectedNode.children.length > 0) {
        this.selectedNodes = this.selectedNodes.filter(node => {
          return !this.isChildOf(node, selectedNode);
        });
        
        selectedNode.children.forEach((child: TreeNode) => {
          child.selectable = false;
        });
      } 
      else {
        const parent = this.findParentNode(selectedNode);
        if (parent) {
          this.selectedNodes = this.selectedNodes.filter(node => node !== parent);
          parent.selectable = false;
        }
      }
    }, 0);
  }

  onNodeUnselect(event: any) {
    setTimeout(() => {
      const unselectedNode = event.node;
      
      if (unselectedNode.children && unselectedNode.children.length > 0) {
        unselectedNode.children.forEach((child: TreeNode) => {
          child.selectable = true;
        });
      } 
      else {
        const parent = this.findParentNode(unselectedNode);
        if (parent) {
          const hasOtherChildrenSelected = parent.children?.some((child: TreeNode) => 
            this.selectedNodes.includes(child) && child !== unselectedNode
          );
          
          if (!hasOtherChildrenSelected) {
            parent.selectable = true;
          }
        }
      }
    }, 0);
  }

  private isChildOf(node: TreeNode, potentialParent: TreeNode): boolean {
    if (!potentialParent.children) return false;
    return potentialParent.children.some(child => child === node);
  }

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
