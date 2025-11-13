export interface SpeciesInfo {
  id: number;
  objectId: number;
  observationDate: Date;
  heightM?: number;
  dbmCm?: number;
  ageYears?: number;
  condition?: number;
  createdAt: Date;
  updatedAt?: Date;
}

export interface SpeciesInfoRequest {
  objectId: number;
  observationDate?: Date;
  heightM?: number;
  dbmCm?: number;
  ageYears?: number;
  condition?: number;
}
