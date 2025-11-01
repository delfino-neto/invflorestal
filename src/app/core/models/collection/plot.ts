export interface Plot {
    id?: number;
    areaId: number;
    areaName?: string;
    geometry: string;
    plotCode: string;
    areaM2: number;
    slopeDeg?: number;
    aspectDeg?: number;
    notes?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface PlotRequest {
    areaId: number;
    geometry: string;
    plotCode: string;
    areaM2: number;
    slopeDeg?: number;
    aspectDeg?: number;
    notes?: string;
}
