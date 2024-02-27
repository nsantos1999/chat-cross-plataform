import { Module, forwardRef } from '@nestjs/common';
import { MicrosoftTeamsController } from './controllers/microsoft-teams.controller';
import { MessageSwitcherModule } from '../message-switcher/message-switcher.module';
import { MSTeamsService } from './service/ms-teams.service';
import { MicrosoftTeamsService } from './service/microsoft-teams.service';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ConversationReference,
  ConversationReferenceSchema,
} from './schemas/conversation-reference.schema';
import { ConversarionReferenceRepository } from './repositories/conversation-reference.repository';

@Module({
  imports: [
    forwardRef(() => MessageSwitcherModule),
    MongooseModule.forFeature([
      { name: ConversationReference.name, schema: ConversationReferenceSchema },
    ]),
  ],
  controllers: [MicrosoftTeamsController],
  providers: [
    MicrosoftTeamsService,
    MSTeamsService,
    ConversarionReferenceRepository,
  ],
  exports: [
    MicrosoftTeamsService,
    MSTeamsService,
    ConversarionReferenceRepository,
  ],
})
export class MicrosoftTeamsModule {}
