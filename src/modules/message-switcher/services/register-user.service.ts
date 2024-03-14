import { Inject, Injectable } from '@nestjs/common';
import { User } from '../schemas/user.schema';
import { UserRegisterStepsEnum } from '../constants/enums/user-register-steps.enum';
import { UserRepository } from '../repositories/user.repository';
import { validate } from 'class-validator';
import { RegisterUserCNPJDto } from '../dtos/register-user.dtos';
import { instanceToInstance } from 'class-transformer';
import { QuestionToRegister } from '../@types/register.types';
import { messagerSenderProvider } from '../providers/messager.provider';
import { MessagerService } from './messager-sender.service';
import { PresenterUtils } from 'src/utils/presenter.utils';

@Injectable()
export class RegisterUserService {
  constructor(
    @Inject(messagerSenderProvider.MessagerSender1.provide)
    private readonly whatsappService: MessagerService,

    private readonly userRepository: UserRepository,
  ) {}

  async saveDataAndReturnNextQuestion(
    user: User,
    message: string,
    firstInteraction: boolean,
  ) {
    let currentUserData = user;

    let nextStep = currentUserData.registerStep;

    if (firstInteraction) {
      nextStep = this.getNextStep(firstInteraction, currentUserData);
    }

    if (
      !firstInteraction &&
      user.registerStep !== UserRegisterStepsEnum.REGISTERED
    ) {
      try {
        await this.registerUserInfo(user.phone, message, user.registerStep);

        currentUserData = await this.userRepository.findByPhone(user.phone);

        nextStep = this.getNextStep(firstInteraction, currentUserData);

        await this.userRepository.updateByPhone(user.phone, {
          registerStep: nextStep,
        });
      } catch (err) {
        await this.whatsappService.sendMessage({
          id: String(user.phone),
          text:
            err?.message || 'Há algo de errado com os dados. Tente novamente',
        });
      }
    }

    return this.getQuestionToUser(nextStep, currentUserData);
  }

  userRegistered(user: User) {
    if (user.registerStep === UserRegisterStepsEnum.REGISTERED) {
      return true;
    }

    return false;
  }

  private getNextStep(isFirstInteraction: boolean, user: User) {
    if (
      !isFirstInteraction &&
      user.registerStep === UserRegisterStepsEnum.REGISTERED
    ) {
      return UserRegisterStepsEnum.REGISTERED;
    }

    if (isFirstInteraction) {
      return UserRegisterStepsEnum.ASK_NAME;
    }

    if (user.isCustomer === undefined) {
      return UserRegisterStepsEnum.ASK_IF_IS_CUSTOMER;
    }

    if (user.isCustomer === false) {
      return UserRegisterStepsEnum.REGISTERED;
    }

    switch (user.registerStep) {
      case UserRegisterStepsEnum.ASK_IF_IS_CUSTOMER:
        return UserRegisterStepsEnum.ASK_CNPJ;
      case UserRegisterStepsEnum.ASK_CNPJ:
        return UserRegisterStepsEnum.REGISTERED;
      default:
        return user.registerStep;
    }
  }

  private getQuestionToUser(
    stepToGetQuestion: UserRegisterStepsEnum,
    user: User,
  ): QuestionToRegister | null {
    switch (stepToGetQuestion) {
      case UserRegisterStepsEnum.ASK_NAME:
        return {
          question: `Olá, ${PresenterUtils.presenterPeriodGreeting().toLowerCase()}, como se chama?`,
        };
      case UserRegisterStepsEnum.ASK_IF_IS_CUSTOMER:
        return {
          question: `${user.name}, você é um cliente?`,
          options: [
            {
              id: 1,
              title: 'Sim',
            },
            {
              id: 2,
              title: 'Não',
            },
          ],
        };
      case UserRegisterStepsEnum.ASK_CNPJ:
        return {
          question: `${user.name}, me diga seu CNPJ? Pode ser formatado ou não (ex: 12.123.123/0001-12 ou 12123123000112)`,
        };
      case UserRegisterStepsEnum.REGISTERED:
        return {
          question: `${user.name}, agora me diga como podemos te ajudar que irei te encaminhar para um dos nossos atendentes disponíveis.`,
        };
      default:
        return {
          question:
            'Não podemos te atender no momento. Tente novamente mais tarde',
        };
    }
  }

  private async registerUserInfo(
    phone: number,
    message: string,
    userRegisterStep: UserRegisterStepsEnum,
  ) {
    switch (userRegisterStep) {
      case UserRegisterStepsEnum.FIRST_INTERACTION:
      case UserRegisterStepsEnum.ASK_NAME:
        return this.userRepository.updateByPhone(phone, {
          name: message,
          registerStep: userRegisterStep,
        });
      case UserRegisterStepsEnum.ASK_IF_IS_CUSTOMER:
        return this.userRepository.updateByPhone(phone, {
          isCustomer: message === '1',
          registerStep: userRegisterStep,
        });
      case UserRegisterStepsEnum.ASK_CNPJ:
        const { cnpj } = await this.validateInputRegisterData(
          new RegisterUserCNPJDto({ cnpj: message }),
        );

        return this.userRepository.updateByPhone(phone, {
          cnpj: Number(cnpj),
          registerStep: userRegisterStep,
        });
      default:
        return this.userRepository.updateByPhone(phone, {
          registerStep: userRegisterStep,
        });
    }
  }

  private async validateInputRegisterData<T extends object>(data: T) {
    const transformedData = instanceToInstance(data);

    const validationResult = await validate(transformedData, {
      stopAtFirstError: true,
    });

    if (validationResult[0]) {
      throw new Error(Object.values(validationResult[0].constraints)[0]);
    }

    return transformedData;
  }
}
