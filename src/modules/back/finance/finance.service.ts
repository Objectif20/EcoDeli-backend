import { Injectable } from "@nestjs/common";
import { StripeStats, Transaction, TransactionCategory, TransactionType } from "./type";
import * as fs from "fs";
import * as path from "path";
import Stripe from "stripe";

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

    generateCsv(params: {
        startMonth?: string;
        startYear?: string;
        endMonth?: string;
        endYear?: string;
        categories?: TransactionCategory[];
    }): string {
        let transactions = [...allTransactions];

        if (params.startYear || params.startMonth) {
            transactions = transactions.filter(t => {
                const date = new Date(t.date);
                const year = date.getFullYear().toString();
                const month = (date.getMonth() + 1).toString();

                const startYearMatch = params.startYear ? year === params.startYear : true;
                const startMonthMatch = params.startMonth ? month === params.startMonth : true;

                return startYearMatch && startMonthMatch;
            });
        }

        if (params.endYear || params.endMonth) {
            transactions = transactions.filter(t => {
                const date = new Date(t.date);
                const year = date.getFullYear().toString();
                const month = (date.getMonth() + 1).toString();

                const endYearMatch = params.endYear ? year === params.endYear : true;
                const endMonthMatch = params.endMonth ? month === params.endMonth : true;

                return endYearMatch && endMonthMatch;
            });
        }

        if (params.categories && params.categories.length > 0) {
            transactions = transactions.filter(t => params.categories?.includes(t.category));
        }

        const csvContent = [
            ['id', 'name', 'type', 'category', 'date', 'invoiceUrl'].join(','),
            ...transactions.map(t =>
                [t.id, t.name, t.type, t.category, t.date, t.invoiceUrl].join(',')
            )
        ].join('\n');

        const filePath = path.join(__dirname, '..', 'transactions.csv');
        fs.writeFileSync(filePath, csvContent);

        return filePath;
    }

    getCsvFile(res: any, params: {
        startMonth?: string;
        startYear?: string;
        endMonth?: string;
        endYear?: string;
        categories?: TransactionCategory[];
    }): void {
        const filePath = this.generateCsv(params);
        if (fs.existsSync(filePath)) {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=transactions.csv');
            fs.createReadStream(filePath).pipe(res);
        } else {
            res.status(404).send('File not found');
        }
    }

    async getStripeStats(period ?: string): Promise<StripeStats> {
      console.log("getStripeStats", period);
      return {
        revenue: {
          total: 48250,
          previousPeriod: 42100,
          percentChange: 14.6,
          byPeriod: [
            { date: "Jan", revenue: 4000, profit: 2400, margin: 60 },
            { date: "Fév", revenue: 4500, profit: 2700, margin: 60 },
            { date: "Mar", revenue: 5000, profit: 3000, margin: 60 },
            { date: "Avr", revenue: 4800, profit: 2880, margin: 60 },
            { date: "Mai", revenue: 5200, profit: 3120, margin: 60 },
            { date: "Juin", revenue: 5800, profit: 3480, margin: 60 },
            { date: "Juil", revenue: 6200, profit: 3720, margin: 60 },
            { date: "Août", revenue: 6800, profit: 4080, margin: 60 },
            { date: "Sep", revenue: 7200, profit: 4320, margin: 60 },
            { date: "Oct", revenue: 7800, profit: 4680, margin: 60 },
            { date: "Nov", revenue: 8200, profit: 4920, margin: 60 },
            { date: "Déc", revenue: 8500, profit: 5100, margin: 60 },
          ],
        },
        customers: {
          total: 1248,
          new: 128,
          percentChange: 8.2,
          activeSubscribers: 876,
        },
        payments: {
          successRate: 96.7,
          averageValue: 87.5,
          refundRate: 2.3,
          byMethod: [
            { method: "Carte de crédit", count: 850, value: 32500 },
            { method: "Apple Pay", count: 320, value: 12800 },
            { method: "Google Pay", count: 120, value: 4800 },
            { method: "Virement bancaire", count: 45, value: 1800 },
          ],
        },
        transactions: [
          {
            method: "CB",
            number: 850,
          },
          {
            method: "Apple",
            number: 320,
          },
          {
            method: "Google",
            number: 120,
          },
          {
            method: "Cash",
            number: 30,
          },
          {
            method: "Check",
            number: 15,
          },
        ]
      };

    }

}