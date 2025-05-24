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