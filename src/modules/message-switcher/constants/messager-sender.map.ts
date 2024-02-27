import { MessagerEnum } from './enums/messager.enum';

export const MESSAGER_SENDER_MAP = {
  [MessagerEnum.MS_TEAMS]: MessagerEnum.WHATSAPP,
  [MessagerEnum.WHATSAPP]: MessagerEnum.MS_TEAMS,
};
