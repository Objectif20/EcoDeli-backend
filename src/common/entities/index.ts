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
import { Client } from './client.entity';

export const entities = [
  Admin,
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
  Client
];
