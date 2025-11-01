export * from './auth.service';
export * from './user.service';
export * from './species-taxonomy.service';
export * from './collection-area.service';
export * from './plot.service';
export * from './specimen-object.service';
export * from './media.service';

// Common interfaces
export interface Page<T> {
    content: T[];
    size: number;
    totalElements: number;
}
