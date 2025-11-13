export interface SpecimenObject {
    id?: number;
    plotId: number;
    plotCode?: string;
    speciesId: number;
    speciesScientificName?: string;
    speciesCommonName?: string;
    latitude: number;
    longitude: number;
    observerId: number;
    observerFullName?: string;
    imageUrls?: string[];
    createdAt?: Date;
    updatedAt?: Date;
}

export interface SpecimenObjectRequest {
    plotId: number;
    speciesId: number;
    latitude: number;
    longitude: number;
    observerId: number;
}
