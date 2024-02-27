import { Module } from '@nestjs/common';
import { MessageSwitcherService } from './services/message-switcher.service';
import { messagerSenderProvider } from './providers/messager.provider';
// import { WhatsAppService } from '../whatsapp/services/whatsapp.service';
// import { MicrosoftTeamsService } from '../microsoft-teams/service/microsoft-teams.service';

@Module({
  controllers: [],
  providers: [
    MessageSwitcherService,
    // WhatsAppService,
    // MicrosoftTeamsService,
    messagerSenderProvider.MessagerSender1,
    messagerSenderProvider.MessagerSender2,
  ],
  exports: [MessageSwitcherService],
  // imports: [
  //   forwardRef(() => WhatsAppModule),
  //   forwardRef(() => MicrosoftTeamsModule),
  // ],
})
export class MessageSwitcherModule {}
