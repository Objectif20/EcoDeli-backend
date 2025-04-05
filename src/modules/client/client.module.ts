import { Module } from '@nestjs/common';
import { TutorialModule } from './tutoriel/tuto.module';
import { ThemeModule } from './theme/theme.module';
import { LanguageModule } from './langue/langue.module';
import { ServiceModule } from './services/service.module';

@Module({
    imports: [TutorialModule, ThemeModule, LanguageModule, ServiceModule],
})
export class ClientModule {}

