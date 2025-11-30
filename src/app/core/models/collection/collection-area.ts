export interface CollectionArea {
    id?: number;
    name: string;
    geometry: string;
    createdById: number;
    createdByFullName?: string;
    notes?: string;
    biome?: string;
    climateZone?: string;
    soilType?: string;
    conservationStatus?: string;
    vegetationType?: string;
    altitudeM?: number;
    protectedArea?: boolean;
    protectedAreaName?: string;
    landOwner?: string;
    createdAt?: Date;
    updatedAt?: Date;
    speciesCount?: number;
    specimensCount?: number;
}

export interface CollectionAreaRequest {
    name: string;
    geometry: string;
    notes?: string;
    biome?: string;
    climateZone?: string;
    soilType?: string;
    conservationStatus?: string;
    vegetationType?: string;
    altitudeM?: number;
    protectedArea?: boolean;
    protectedAreaName?: string;
    landOwner?: string;
}
