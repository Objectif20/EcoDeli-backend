import { Contracts } from "./type";


export class GeneralService {

    async getContracts(type: string, page: number = 1, q : string = '') : Promise<{data : Contracts[], total: number}> {
        
        console.log(type, page, q);

        return {
          data : [
            {
              id: "deliveryman-1",
              nom: "Dupont",
              prenom: "Jean",
              contratUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
              dateContrat: "2023-01-15",
            },
            {
              id: "deliveryman-2",
              nom: "Martin",
              prenom: "Marie",
              contratUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
              dateContrat: "2023-02-20",
            },
            {
              id: "deliveryman-3",
              nom: "Bernard",
              prenom: "Luc",
              contratUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
              dateContrat: "2023-03-10",
            },
            {
              id: "deliveryman-4",
              nom: "Dubois",
              prenom: "Sophie",
              contratUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
              dateContrat: "2023-04-05",
            },
            {
              id: "deliveryman-5",
              nom: "Thomas",
              prenom: "Pierre",
              contratUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
              dateContrat: "2023-05-12",
            },
            {
              id: "deliveryman-6",
              nom: "Robert",
              prenom: "Claire",
              contratUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
              dateContrat: "2023-06-18",
            },
            {
              id: "deliveryman-7",
              nom: "Richard",
              prenom: "Paul",
              contratUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
              dateContrat: "2023-07-22",
            },
            {
              id: "deliveryman-8",
              nom: "Petit",
              prenom: "Julie",
              contratUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
              dateContrat: "2023-08-30",
            },
            {
              id: "deliveryman-9",
              nom: "Durand",
              prenom: "Nicolas",
              contratUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
              dateContrat: "2023-09-14",
            },
            {
              id: "deliveryman-10",
              nom: "Leroy",
              prenom: "Camille",
              contratUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
              dateContrat: "2023-10-25",
            },
            {
              id: "deliveryman-11",
              nom: "Moreau",
              prenom: "Hugo",
              contratUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
              dateContrat: "2023-11-08",
            },
            {
              id: "deliveryman-12",
              nom: "Simon",
              prenom: "Emma",
              contratUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
              dateContrat: "2023-12-19",
            },
          ], 
          total : 12
        }

    }

}