import { Injectable } from '@nestjs/common';
import { MessageSwitcherService } from 'src/modules/message-switcher/services/message-switcher.service';

@Injectable()
export class MicrosoftTeamsService {
  constructor(private readonly _: MessageSwitcherService) {}
}
