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