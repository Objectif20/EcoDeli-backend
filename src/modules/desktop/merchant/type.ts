export interface MerchantDetails {
    info: {
      profile_picture: string | null
      first_name: string
      last_name: string
      description: string
      email: string
      phone: string
      nbDemandeDeLivraison: number
      nomAbonnement: string
      nbSignalements: number
      entreprise: string
      siret: string
      pays: string
      contractUrl : string
    }
  }

export interface AllMerchant {
    id : string;
    companyName: string;
    siret : string;
    city : string;
    address : string;
    postalCode : string;
    country : string;
    phone : string;
    description : string;
    profilePicture : string | null;
    firstName : string;
    lastName : string;
}