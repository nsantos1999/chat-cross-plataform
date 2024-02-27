import { Module, forwardRef } from '@nestjs/common';
import { MicrosoftTeamsController } from './controllers/microsoft-teams.controller';
import { MessageSwitcherModule } from '../message-switcher/message-switcher.module';
import { MSTeamsService } from './service/ms-teams.service';
import { MicrosoftTeamsService } from './service/microsoft-teams.service';

@Module({
  imports: [forwardRef(() => MessageSwitcherModule)],
  controllers: [MicrosoftTeamsController],
  providers: [MicrosoftTeamsService, MSTeamsService],
  exports: [MicrosoftTeamsService, MSTeamsService],
})
export class MicrosoftTeamsModule {}
