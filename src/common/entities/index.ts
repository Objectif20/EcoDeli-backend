import { Admin } from './admin.entity';
import { RoleList } from './role_list.entity';
import { Ticket } from './ticket.entity';
import { Role } from './roles.entity';
import { Languages } from './languages.entity';
import { Users } from './user.entity';
import { Services } from './service.entity';
import { ServicesList } from './services_list.entity';
import { Themes } from './theme.entity';
import { ProviderContracts } from './providers_contracts.entity';
import { ProviderDocuments } from './providers_documents.entity';
import { ProviderKeywords } from './provider_keyword.entity';
import { ProviderKeywordsList } from './provider_keywords_list.entity';
import { Providers } from './provider.entity';
import { Report } from './report.entity';
import { DeliveryPerson } from './delivery_persons.entity';
import { Vehicle } from './vehicle.entity';
import { Category } from './category.entity';
import { DeliveryPersonDocument } from './delivery_person_documents.entity';
import { ServiceImage } from './services_image.entity';
import { Sector } from './sector.entity';
import { Merchant } from './merchant.entity';
import { MerchantSector } from './merchant_sector.entity';
import { MerchantContract } from './merchant_contract.entity';
import { MerchantDocument } from './merchant_document.entity';
import { Plan } from './plan.entity';
import { Subscription } from './subscription.entity';
import { AdminReport } from './admin_reports.entity';
import { Appointments } from './appointments.entity';
import { PrestaReview } from './presta_reviews.entity';
import { PrestaReviewResponse } from './presta_review_responses.entity';
import { FavoriteService } from './favorite_services.entity';
import { Client } from './client.entity';
import { ProviderCommission } from './provider_commissions.entity';
import { VehicleDocument } from './vehicle_documents.entity';
import { DeliveryCommission } from './delivery_commission.entity';
import { Shipment } from './shipment.entity';
import { Delivery } from './delivery.entity';
import { DeliveryReviewResponse } from './delivery_review_responses.entity';
import { DeliveryReview } from './delivery_reviews.entity';
import { Keyword } from './keywords.entity';
import { DeliveryKeyword } from './delivery_keywords.entity';
import { Warehouse } from './warehouses.entity';
import { ExchangePoint } from './exchange_points.entity';
import { Store } from './stores.entity';
import { Parcel } from './parcels.entity';
import { ParcelImage } from './parcel_images.entity';
import { Favorite } from './favorites.entity';
import { Transfer } from './transfers.entity';
import { Trip } from './trips.entity';
import { Blocked } from './blocked.entity';
import { Availability } from './availibities.entity';

export const entities = [
  Admin,
  Trip,
  Transfer,
  Parcel,
  Favorite,
  ParcelImage,
  Warehouse,
  ExchangePoint,
  Store,
  Keyword,
  DeliveryKeyword,
  Delivery,
  DeliveryReviewResponse,
  DeliveryReview,
  DeliveryCommission,
  Shipment,
  VehicleDocument,
  Subscription,
  Plan,
  MerchantDocument,
  MerchantContract,
  MerchantSector,
  Sector,
  Merchant,
  RoleList,
  Role,
  Ticket,
  Languages,
  Users,
  Services,
  ServicesList,
  Themes,
  ProviderContracts,
  ProviderDocuments,
  ProviderKeywords,
  ProviderKeywordsList,
  Providers,
  DeliveryPerson,
  Vehicle,
  Category,
  DeliveryPersonDocument,
  ServiceImage,
  Report,
  AdminReport,
  Appointments,
  PrestaReview,
  PrestaReviewResponse,
  FavoriteService,
  Client,
  ProviderCommission,
  Blocked,
  Availability,
];