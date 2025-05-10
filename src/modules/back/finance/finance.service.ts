import { Injectable } from "@nestjs/common";
import { Transaction, TransactionType } from "./type";


export const allTransactions: Transaction[] = [
    {
      id: "TR-001",
      name: "Jean Dupont",
      type: "sub",
      category: "sub",
      date: "01/2024",
      invoiceUrl: "https://example.com/invoice/TR-001.pdf",
    },
    {
      id: "TR-002",
      name: "Marie Martin",
      type: "in",
      category: "service",
      date: "2024-02-15",
      invoiceUrl: "https://example.com/invoice/TR-002.pdf",
    },
    {
      id: "TR-003",
      name: "Pierre Durand",
      type: "out",
      category: "delivery",
      date: "2024-03-22",
      invoiceUrl: "https://example.com/invoice/TR-003.pdf",
    },
    {
      id: "TR-004",
      name: "Sophie Bernard",
      type: "sub",
      category: "sub",
      date: "02/2024",
      invoiceUrl: "https://example.com/invoice/TR-004.pdf",
    },
    {
      id: "TR-005",
      name: "Lucas Petit",
      type: "in",
      category: "service",
      date: "2024-01-10",
      invoiceUrl: "https://example.com/invoice/TR-005.pdf",
    },
    {
      id: "TR-006",
      name: "Emma Leroy",
      type: "out",
      category: "delivery",
      date: "2023-12-05",
      invoiceUrl: "https://example.com/invoice/TR-006.pdf",
    },
    {
      id: "TR-007",
      name: "Thomas Moreau",
      type: "sub",
      category: "sub",
      date: "03/2024",
      invoiceUrl: "https://example.com/invoice/TR-007.pdf",
    },
    {
      id: "TR-008",
      name: "Camille Roux",
      type: "in",
      category: "service",
      date: "2024-04-18",
      invoiceUrl: "https://example.com/invoice/TR-008.pdf",
    },
    {
      id: "TR-009",
      name: "Antoine Girard",
      type: "out",
      category: "delivery",
      date: "2023-11-30",
      invoiceUrl: "https://example.com/invoice/TR-009.pdf",
    },
    {
      id: "TR-010",
      name: "Julie Fournier",
      type: "sub",
      category: "sub",
      date: "04/2024",
      invoiceUrl: "https://example.com/invoice/TR-010.pdf",
    },
    {
      id: "TR-011",
      name: "Nicolas Lambert",
      type: "in",
      category: "service",
      date: "2024-05-02",
      invoiceUrl: "https://example.com/invoice/TR-011.pdf",
    },
    {
      id: "TR-012",
      name: "Léa Bonnet",
      type: "out",
      category: "delivery",
      date: "2023-10-15",
      invoiceUrl: "https://example.com/invoice/TR-012.pdf",
    }
  ];



@Injectable()
export class FinanceService {
    constructor() {}

    getTransactions(params: {
        name?: string;
        type?: TransactionType;
        year?: string;
        month?: string;
        pageIndex: number;
        pageSize: number;
    }): Promise<{data : Transaction[], totalRows: number}> {
        let transactions = [...allTransactions];

        if (params.name) {
            transactions = transactions.filter(t => params.name && t.name.includes(params.name));
        }

        if (params.type) {
            transactions = transactions.filter(t => t.type === params.type);
        }

        if (params.year) {
            transactions = transactions.filter(t => {
                const date = new Date(t.date);
                return date.getFullYear().toString() === params.year;
            });
        }

        if (params.month) {
            transactions = transactions.filter(t => {
                const date = new Date(t.date);
                return (date.getMonth() + 1).toString() === params.month;
            });
        }

        const startIndex = params.pageIndex * params.pageSize;
        return Promise.resolve({
            data: transactions.slice(startIndex, startIndex + params.pageSize),
            totalRows: transactions.length
        });
    }
}