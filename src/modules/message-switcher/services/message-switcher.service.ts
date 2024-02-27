import { Inject, Injectable } from '@nestjs/common';
import { MessagerEnum } from '../constants/enums/messager.enum';
import { MESSAGER_SENDER_MAP } from '../constants/messager-sender.map';
import { MessagerService } from './messager-sender.service';
import { messagerSenderProvider } from '../providers/messager.provider';
import { UserRepository } from '../repositories/user.repository';
import { UserRegisterStepsEnum } from '../constants/enums/user-register-steps.enum';
import { User } from '../schemas/user.schema';

@Injectable()
export class MessageSwitcherService {
  constructor(
    @Inject(messagerSenderProvider.MessagerSender1.provide)
    private readonly whatsappService: MessagerService,

    @Inject(messagerSenderProvider.MessagerSender2.provide)
    private readonly msTeamsService: MessagerService,

    private readonly userRepository: UserRepository,
  ) {}

  receiveMessage(id: string, message: string, from: MessagerEnum) {
    // let idToSend = '9d9e733f-3125-4a73-923d-957327e6ace2';
    // if (from === MessagerEnum.MS_TEAMS) {
    //   idToSend = '5511993933322';
    // }

    // this.getMessagerToSend(from).sendMessage(idToSend, message);

    if (from === MessagerEnum.MS_TEAMS) {
      return this.receiveMessageFromMSTeams(id, message);
    } else {
      return this.receiveMessageFromWhatsapp(id, message);
    }
  }

  private getMessagerToSend(from: MessagerEnum) {
    const to = MESSAGER_SENDER_MAP[from];

    if (messagerSenderProvider.MessagerSender1.provide === to) {
      return this.whatsappService;
    }

    return this.msTeamsService;
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

    console.log(user.registerStep);
    let currentUserData = user;

    if (
      !firstInteraction &&
      ![UserRegisterStepsEnum.REGISTERED].includes(user.registerStep)
    ) {
      console.log('saving...', message);
      await this.registerUserInfo(phone, message, user.registerStep);

      currentUserData = await this.userRepository.findByPhone(Number(phone));
    }

    const nextQuestionToUser = this.getNextQuestionToUser(
      firstInteraction,
      currentUserData,
    );

    if (nextQuestionToUser) {
      await this.userRepository.updateByPhone(Number(phone), {
        registerStep: nextQuestionToUser.step,
      });
      await this.whatsappService.sendMessage(phone, nextQuestionToUser.message);

      return;
    }

    await this.msTeamsService.sendMessage(
      'd1302c7b-d13c-492d-a9c0-9d8743e9dde7',
      `De ${user.name}: ${message}`,
    );
  }

  private async receiveMessageFromMSTeams(id: string, message: string) {
    await this.whatsappService.sendMessage(
      '5511993933322',
      `De Atendente: ${message}`,
    );
  }

  // private async registerFirstInteraction(phone: string) {
  //   return this.userRepository.save({
  //     phone,
  //   });
  // }

  private getNextQuestionToUser(
    isFirstInteraction: boolean,
    user: User,
  ): { step: UserRegisterStepsEnum; message: string } | null {
    if (
      !isFirstInteraction &&
      user.registerStep === UserRegisterStepsEnum.REGISTERED
    ) {
      return null;
    }

    if (isFirstInteraction) {
      return {
        step: UserRegisterStepsEnum.ASK_NAME,
        message: 'Qual o seu nome?',
      };
    }

    console.log(user.isCustomer);

    if (user.isCustomer === undefined) {
      return {
        step: UserRegisterStepsEnum.ASK_IF_IS_CUSTOMER,
        message: 'Você é um cliente? \n\n1 - Sim\n2 - Não',
      };
    }

    if (user.isCustomer === false) {
      return {
        step: UserRegisterStepsEnum.REGISTERED,
        message: 'Me diga como podemos te ajudar?',
      };
    }

    switch (user.registerStep) {
      case UserRegisterStepsEnum.ASK_IF_IS_CUSTOMER:
        return {
          step: UserRegisterStepsEnum.ASK_CNPJ,
          message: 'Diga seu CNPJ',
        };
      case UserRegisterStepsEnum.ASK_CNPJ:
        return {
          step: UserRegisterStepsEnum.REGISTERED,
          message: 'Me diga como podemos te ajudar?',
        };
      default:
        return {
          step: user.registerStep,
          message:
            'Não podemos te atender no momento. Tente novamente mais tarde',
        };
    }
  }

  registerUserInfo(
    phone: string,
    message: string,
    userRegisterStep: UserRegisterStepsEnum,
  ) {
    switch (userRegisterStep) {
      case UserRegisterStepsEnum.ASK_NAME:
        return this.userRepository.updateByPhone(Number(phone), {
          name: message,
          registerStep: userRegisterStep,
        });
      case UserRegisterStepsEnum.ASK_IF_IS_CUSTOMER:
        return this.userRepository.updateByPhone(Number(phone), {
          isCustomer: message === '1',
          registerStep: userRegisterStep,
        });
      case UserRegisterStepsEnum.ASK_CNPJ:
        return this.userRepository.updateByPhone(Number(phone), {
          cnpj: Number(message),
          registerStep: userRegisterStep,
        });
      default:
        return this.userRepository.updateByPhone(Number(phone), {
          registerStep: userRegisterStep,
        });
    }
  }
}
