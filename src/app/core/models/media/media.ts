export enum MediaType {
    IMAGEM = 'IMAGEM',
    VIDEO = 'VIDEO',
    DOCUMENTO = 'DOCUMENTO'
}

export interface Media {
    id?: number;
    objectId: number;
    url: string;
    type: MediaType;
    description?: string;
    uploadedById: number;
    uploadedByFullName?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface MediaRequest {
    objectId: number;
    url: string;
    type: MediaType;
    description?: string;
    uploadedById: number;
}
