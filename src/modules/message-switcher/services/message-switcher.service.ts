import { Inject, Injectable } from '@nestjs/common';
import { MessagerEnum } from '../constants/enums/messager.enum';
import { MessagerService } from './messager-sender.service';
import { messagerSenderProvider } from '../providers/messager.provider';
import { UserRepository } from '../repositories/user.repository';
import { UserRegisterStepsEnum } from '../constants/enums/user-register-steps.enum';
import { RegisterUserService } from './register-user.service';
import { ConversarionReferenceRepository } from 'src/modules/microsoft-teams/repositories/conversation-reference.repository';

@Injectable()
export class MessageSwitcherService {
  private attendantId = '6934888f-eed3-4f76-a9c3-1bd9508ed50c';

  constructor(
    @Inject(messagerSenderProvider.MessagerSender1.provide)
    private readonly whatsappService: MessagerService,

    @Inject(messagerSenderProvider.MessagerSender2.provide)
    private readonly msTeamsService: MessagerService,

    private readonly userRepository: UserRepository,
    private readonly registerUserService: RegisterUserService,
    private readonly conversarionReferenceRepository: ConversarionReferenceRepository,
  ) {}

  receiveMessage(id: string, message: string, from: MessagerEnum) {
    if (from === MessagerEnum.MS_TEAMS) {
      return this.receiveMessageFromMSTeams(id, message);
    } else {
      return this.receiveMessageFromWhatsapp(id, message);
    }
  }

  private async isFirstInteraction(phone: string) {
    const user = await this.userRepository.findByPhone(Number(phone));

    if (!user) {
      const userCreated = await this.userRepository.create({
        phone: Number(phone),
        registerStep: UserRegisterStepsEnum.FIRST_INTERACTION,
      });
      return { firstInteraction: true, user: userCreated };
    }

    return { firstInteraction: false, user };
  }

  private async receiveMessageFromWhatsapp(phone: string, message: string) {
    const { firstInteraction, user } = await this.isFirstInteraction(phone);

    const userRegistered = this.registerUserService.userRegistered(user);

    if (!userRegistered) {
      const { question, options } =
        await this.registerUserService.saveDataAndReturnNextQuestion(
          user,
          message,
          firstInteraction,
          async (message) =>
            await this.whatsappService.sendMessage(phone, message),
        );

      await this.whatsappService.sendMessage(phone, question, options);

      return;
    }

    await this.msTeamsService.sendMessage(
      this.attendantId,
      `De ${user.name}: ${message}`,
    );
  }

  private async receiveMessageFromMSTeams(id: string, message: string) {
    const conversationReference =
      await this.conversarionReferenceRepository.findByUser(this.attendantId);

    await this.whatsappService.sendMessage(
      '5511993933322',
      `De ${conversationReference.user.name}: ${message}`,
    );
  }
}
