export interface CollectionArea {
    id?: number;
    name: string;
    geometry: string;
    createdById: number;
    createdByFullName?: string;
    notes?: string;
    createdAt?: Date;
    updatedAt?: Date;
    speciesCount?: number;
    specimensCount?: number;
}

export interface CollectionAreaRequest {
    name: string;
    geometry: string;
    notes?: string;
}
