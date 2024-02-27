import { Inject, Injectable } from '@nestjs/common';
import { MessagerEnum } from '../constants/enums/messager.enum';
import { MESSAGER_SENDER_MAP } from '../constants/messager-sender.map';
import { MessagerService } from './messager-sender.service';
import { messagerSenderProvider } from '../providers/messager.provider';

@Injectable()
export class MessageSwitcherService {
  constructor(
    @Inject(messagerSenderProvider.MessagerSender2.provide)
    private readonly messagerService2: MessagerService,

    @Inject(messagerSenderProvider.MessagerSender1.provide)
    private readonly messagerService1: MessagerService,
  ) {}

  receiveMessage(id: string, message: string, from: MessagerEnum) {
    console.log(id, from, message);

    let idToSend = '5ea660b8-4abc-4a9e-910b-7f7617be6cab';
    if (from === MessagerEnum.MS_TEAMS) {
      idToSend = '5511993933322';
    }

    this.getMessagerToSend(from).sendMessage(idToSend, message);
  }

  private getMessagerToSend(from: MessagerEnum) {
    const to = MESSAGER_SENDER_MAP[from];

    if (messagerSenderProvider.MessagerSender1.provide === to) {
      return this.messagerService1;
    }

    return this.messagerService2;
  }
}
