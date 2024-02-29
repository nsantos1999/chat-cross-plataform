import { Module, forwardRef } from '@nestjs/common';
import { MessageSwitcherService } from './services/message-switcher.service';
import { messagerSenderProvider } from './providers/messager.provider';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { MicrosoftTeamsModule } from '../microsoft-teams/microsoft-teams.module';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { UserRepository } from './repositories/user.repository';
import { RegisterUserService } from './services/register-user.service';
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
    UserRepository,
    RegisterUserService,
  ],
  exports: [MessageSwitcherService],
  imports: [
    forwardRef(() => WhatsAppModule),
    forwardRef(() => MicrosoftTeamsModule),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
})
export class MessageSwitcherModule {}
