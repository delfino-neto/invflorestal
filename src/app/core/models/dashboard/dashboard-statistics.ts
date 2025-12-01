export interface DashboardStatistics {
    totalSpecimens: number;
    totalSpecies: number;
    totalCollectionAreas: number;
    recentSpecimens: number;
    topSpecies: SpeciesDistribution[];
    recentActivities: RecentActivity[];
}

export interface SpeciesDistribution {
    speciesName: string;
    count: number;
}

export interface RecentActivity {
    id: number;
    action: string;
    species: string;
    time: string;
    user: string;
}
