import { Module, forwardRef } from '@nestjs/common';
import { WhatsAppController } from './controllers/whatsapp.controller';
import { MessageSwitcherModule } from '../message-switcher/message-switcher.module';
import { WhatsAppService } from './services/whatsapp.service';

@Module({
  imports: [forwardRef(() => MessageSwitcherModule)],
  controllers: [WhatsAppController],
  providers: [WhatsAppService],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
