export * from './auth.service';
export * from './user.service';
export * from './species-taxonomy.service';
export * from './collection-area.service';
export * from './plot.service';
export * from './specimen-object.service';
export * from './media.service';
export * from './species-info.service';
export * from './data-import.service';
export * from './dashboard.service';

export interface Page<T> {
    content: T[];
    size: number;
    totalElements: number;
}
