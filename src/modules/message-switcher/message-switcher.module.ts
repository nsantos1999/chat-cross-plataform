import { Module, forwardRef } from '@nestjs/common';
import { MessageSwitcherService } from './services/message-switcher.service';
import { messagerSenderProvider } from './providers/messager.provider';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { MicrosoftTeamsModule } from '../microsoft-teams/microsoft-teams.module';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { UserRepository } from './repositories/user.repository';
import { RegisterUserService } from './services/register-user.service';
import { Service, ServiceSchema } from './schemas/service.schema';
import { CustomerServiceService } from './services/customer-service.service';
import { ServiceRepository } from './repositories/service.repository';
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
    ServiceRepository,
    CustomerServiceService,
  ],
  exports: [MessageSwitcherService],
  imports: [
    forwardRef(() => WhatsAppModule),
    forwardRef(() => MicrosoftTeamsModule),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Service.name, schema: ServiceSchema },
    ]),
  ],
})
export class MessageSwitcherModule {}
