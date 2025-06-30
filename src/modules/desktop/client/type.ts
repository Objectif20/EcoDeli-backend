export interface AllClient {
    id : string;
    profile_picture : string;
    first_name : string;
    last_name : string;
    email : string;
    nbDemandeDeLivraison: number;
    nbSignalements: number;
    nomAbonnement: string;
    profilTransporteur: boolean;
}


export interface ClientDetails {
    info: {
      profile_picture: string | null
      first_name: string
      last_name: string
      email: string
      nbDemandeDeLivraison: number
      nomAbonnement: string
      nbSignalements: number
      nombreDePrestations: number
      profilTransporteur: boolean
      idTransporteur?: string
    }
  }