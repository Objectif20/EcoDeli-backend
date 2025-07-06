export interface ShipmentDetails {
  deliveryCode: string;
  departureCity: string;
  departureAddress: string;
  arrivalCity: string;
  arrivalAddress: string;
  numberOfPackages: number;
  totalWeight: number;
  qrCodeBase64: string;
}

export interface InvoiceLineItem {
  label: string;
  value: number;
}

export interface InvoiceDetails {
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  customerEmail: string;
  deliveryId: string;
  shipmentDescription: string;
  deliveryCode: string;
  deliveryDate: string;
  departureCity: string;
  arrivalCity: string;
  deliveryPersonName: string;
  deliveryPersonPhone: string;
  lineItems: InvoiceLineItem[];
  totalAmount: number;
  isMainStep: boolean;
  stripeIntentId?: string | null;
}

export interface TransferDetails {
    transferId: string;
    transferDate: string;
    amount: number;
    senderName: string;
    senderFirstName: string;
    recipientName: string;
    recipientFirstName: string;
    description: string;
}

export interface BillingData {
  invoiceNumber: string;
  invoiceDate: Date;
  periodLabel: string;
  customer: {
    name: string;
    email: string;
    address: string;
  };
  plan: {
    name: string;
    price: number;
    description: string;
  };
  subscription: {
    id: string;
    startDate: Date;
    endDate: Date;
  };
}