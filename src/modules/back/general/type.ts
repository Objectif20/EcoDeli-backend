export interface Contracts {
    id: string
    nom: string
    prenom: string
    profilePicture ?: string | null
    contratUrl: string
    dateContrat: string
}

export type VehicleCategory = {
    id: string | null
    name: string
    max_weight: number
    max_dimension: number
}