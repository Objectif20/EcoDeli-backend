import {Admin} from './admin.entity';
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

export const entities = [Admin, RoleList,Role, Ticket, Languages, Users, Services,ServicesList, Themes, ProviderContracts, ProviderDocuments, ProviderKeywords, ProviderKeywordsList, Providers, Report];
