export type TransactionType = "sub" | "in" | "out"
export type TransactionCategory = "sub" | "delivery" | "service"

export type Transaction = {
  id: string
  name: string
  type: TransactionType
  category: TransactionCategory
  date: string
  invoiceUrl?: string
}

export interface StripeStats {
  revenue: RevenueStats;
  customers: CustomerStats;
  payments: PaymentStats;
  transactions: TransactionStripe[];
}

export interface RevenueStats {
  total: number;
  previousPeriod: number;
  percentChange: number;
  byPeriod: PeriodData[];
}

export interface CustomerStats {
  total: number;
  new: number;
  percentChange: number;
  activeSubscribers: number;
}

export interface PaymentStats {
  successRate: number;
  averageValue: number;
  refundRate: number;
  byMethod: PaymentMethod[];
}

export interface PaymentMethod {
  method: string;
  count: number;
  value: number;
}

export interface PeriodData {
  date: string;
  revenue: number;
  profit: number;
  margin: number;
}


export interface TransactionStripe {
  method: string;
  number: number;
}

export interface DashboardStats {
  plan: PlanChartData[];
  parcels: ParcelsChartData[];
  area: AreaChartData[];
  subscription: SubscriptionChartData[];
}

export interface AreaChartData {
  date: string;
  provider: number;
  delivery: number;
}

export interface SubscriptionChartData {
  month: string;
  subscription: number;
}

export interface PlanChartData {
  plan: string;
  number: number;
  fill: string;
}

export interface ParcelsChartData {
  taille: string;
  nombre: number;
}