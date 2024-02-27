import { WhatsAppService } from 'src/modules/whatsapp/services/whatsapp.service';
import { MessagerEnum } from '../constants/enums/messager.enum';
import { MSTeamsService } from 'src/modules/microsoft-teams/service/ms-teams.service';

export const messagerSenderProvider = {
  MessagerSender1: {
    provide: MessagerEnum.WHATSAPP,
    useClass: WhatsAppService,
  },
  MessagerSender2: {
    provide: MessagerEnum.MS_TEAMS,
    useClass: MSTeamsService,
  },
};
