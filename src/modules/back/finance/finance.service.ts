import { Injectable } from "@nestjs/common";
import { DashboardStats, StripeStats, Transaction, TransactionCategory, TransactionType } from "./type";
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


    async getDashboardStats(): Promise<DashboardStats> {

      return {
        plan: [
          { plan: "free", number: 275, fill: "var(--color-free)" },
          { plan: "starter", number: 200, fill: "var(--color-starter)" },
          { plan: "premium", number: 187, fill: "var(--color-premium)" },
        ],
        parcels: [
          { taille: "Petit colis (S)", nombre: 120 },
          { taille: "Moyen colis (M)", nombre: 200 },
          { taille: "Grand colis (L)", nombre: 150 },
          { taille: "Très grand colis (XL)", nombre: 80 },
        ],
        area: [
          { date: "2024-04-01", provider: 222, delivery: 150 },
          { date: "2024-04-02", provider: 97, delivery: 180 },
          { date: "2024-04-03", provider: 167, delivery: 120 },
          { date: "2024-04-04", provider: 242, delivery: 260 },
          { date: "2024-04-05", provider: 373, delivery: 290 },
          { date: "2024-04-06", provider: 301, delivery: 340 },
          { date: "2024-04-07", provider: 245, delivery: 180 },
          { date: "2024-04-08", provider: 409, delivery: 320 },
          { date: "2024-04-09", provider: 59, delivery: 110 },
          { date: "2024-04-10", provider: 261, delivery: 190 },
          { date: "2024-04-11", provider: 327, delivery: 350 },
          { date: "2024-04-12", provider: 292, delivery: 210 },
          { date: "2024-04-13", provider: 342, delivery: 380 },
          { date: "2024-04-14", provider: 137, delivery: 220 },
          { date: "2024-04-15", provider: 120, delivery: 170 },
          { date: "2024-04-16", provider: 138, delivery: 190 },
          { date: "2024-04-17", provider: 446, delivery: 360 },
          { date: "2024-04-18", provider: 364, delivery: 410 },
          { date: "2024-04-19", provider: 243, delivery: 180 },
          { date: "2024-04-20", provider: 89, delivery: 150 },
          { date: "2024-04-21", provider: 137, delivery: 200 },
          { date: "2024-04-22", provider: 224, delivery: 170 },
          { date: "2024-04-23", provider: 138, delivery: 230 },
          { date: "2024-04-24", provider: 387, delivery: 290 },
          { date: "2024-04-25", provider: 215, delivery: 250 },
          { date: "2024-04-26", provider: 75, delivery: 130 },
          { date: "2024-04-27", provider: 383, delivery: 420 },
          { date: "2024-04-28", provider: 122, delivery: 180 },
          { date: "2024-04-29", provider: 315, delivery: 240 },
          { date: "2024-04-30", provider: 454, delivery: 380 },
          { date: "2024-05-01", provider: 165, delivery: 220 },
          { date: "2024-05-02", provider: 293, delivery: 310 },
          { date: "2024-05-03", provider: 247, delivery: 190 },
          { date: "2024-05-04", provider: 385, delivery: 420 },
          { date: "2024-05-05", provider: 481, delivery: 390 },
          { date: "2024-05-06", provider: 498, delivery: 520 },
          { date: "2024-05-07", provider: 388, delivery: 300 },
          { date: "2024-05-08", provider: 149, delivery: 210 },
          { date: "2024-05-09", provider: 227, delivery: 180 },
          { date: "2024-05-10", provider: 293, delivery: 330 },
          { date: "2024-05-11", provider: 335, delivery: 270 },
          { date: "2024-05-12", provider: 197, delivery: 240 },
          { date: "2024-05-13", provider: 197, delivery: 160 },
          { date: "2024-05-14", provider: 448, delivery: 490 },
          { date: "2024-05-15", provider: 473, delivery: 380 },
          { date: "2024-05-16", provider: 338, delivery: 400 },
          { date: "2024-05-17", provider: 499, delivery: 420 },
          { date: "2024-05-18", provider: 315, delivery: 350 },
          { date: "2024-05-19", provider: 235, delivery: 180 },
          { date: "2024-05-20", provider: 177, delivery: 230 },
          { date: "2024-05-21", provider: 82, delivery: 140 },
          { date: "2024-05-22", provider: 81, delivery: 120 },
          { date: "2024-05-23", provider: 252, delivery: 290 },
          { date: "2024-05-24", provider: 294, delivery: 220 },
          { date: "2024-05-25", provider: 201, delivery: 250 },
          { date: "2024-05-26", provider: 213, delivery: 170 },
          { date: "2024-05-27", provider: 420, delivery: 460 },
          { date: "2024-05-28", provider: 233, delivery: 190 },
          { date: "2024-05-29", provider: 78, delivery: 130 },
          { date: "2024-05-30", provider: 340, delivery: 280 },
          { date: "2024-05-31", provider: 178, delivery: 230 },
          { date: "2024-06-01", provider: 178, delivery: 200 },
          { date: "2024-06-02", provider: 470, delivery: 410 },
          { date: "2024-06-03", provider: 103, delivery: 160 },
          { date: "2024-06-04", provider: 439, delivery: 380 },
          { date: "2024-06-05", provider: 88, delivery: 140 },
          { date: "2024-06-06", provider: 294, delivery: 250 },
          { date: "2024-06-07", provider: 323, delivery: 370 },
          { date: "2024-06-08", provider: 385, delivery: 320 },
          { date: "2024-06-09", provider: 438, delivery: 480 },
          { date: "2024-06-10", provider: 155, delivery: 200 },
          { date: "2024-06-11", provider: 92, delivery: 150 },
          { date: "2024-06-12", provider: 492, delivery: 420 },
          { date: "2024-06-13", provider: 81, delivery: 130 },
          { date: "2024-06-14", provider: 426, delivery: 380 },
          { date: "2024-06-15", provider: 307, delivery: 350 },
          { date: "2024-06-16", provider: 371, delivery: 310 },
          { date: "2024-06-17", provider: 475, delivery: 520 },
          { date: "2024-06-18", provider: 107, delivery: 170 },
          { date: "2024-06-19", provider: 341, delivery: 290 },
          { date: "2024-06-20", provider: 408, delivery: 450 },
          { date: "2024-06-21", provider: 169, delivery: 210 },
          { date: "2024-06-22", provider: 317, delivery: 270 },
          { date: "2024-06-23", provider: 480, delivery: 530 },
          { date: "2024-06-24", provider: 132, delivery: 180 },
          { date: "2024-06-25", provider: 141, delivery: 190 },
          { date: "2024-06-26", provider: 434, delivery: 380 },
          { date: "2024-06-27", provider: 448, delivery: 490 },
          { date: "2024-06-28", provider: 149, delivery: 200 },
          { date: "2024-06-29", provider: 103, delivery: 160 },
          { date: "2024-06-30", provider: 446, delivery: 400 },
        ],
        subscription: [
          { month: "Janvier", subscription: 186 },
          { month: "Février", subscription: 305 },
          { month: "Mars", subscription: 237 },
          { month: "Avril", subscription: 273 },
          { month: "Mai", subscription: 209 },
          { month: "Juin", subscription: 214 },
        ],
      };

    }

}