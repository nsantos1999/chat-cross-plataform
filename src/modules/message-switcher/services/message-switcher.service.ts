import { Inject, Injectable } from '@nestjs/common';
import { MessagerEnum } from '../constants/enums/messager.enum';
import { MessagerService } from './messager-sender.service';
import { messagerSenderProvider } from '../providers/messager.provider';
import { UserRepository } from '../repositories/user.repository';
import { UserRegisterStepsEnum } from '../constants/enums/user-register-steps.enum';
import { RegisterUserService } from './register-user.service';
import { CustomerServiceService } from './customer-service.service';
import { possibleCommands } from '../constants/possible-commands';
import { MappedCommands } from '../constants/enums/mapped-commands.enum';

@Injectable()
export class MessageSwitcherService {
  constructor(
    @Inject(messagerSenderProvider.MessagerSender1.provide)
    private readonly whatsappService: MessagerService,

    @Inject(messagerSenderProvider.MessagerSender2.provide)
    private readonly msTeamsService: MessagerService,

    private readonly userRepository: UserRepository,
    private readonly registerUserService: RegisterUserService,
    private readonly customerServiceService: CustomerServiceService,
  ) {}

  receiveMessage({
    id,
    message,
    from,
    attachments,
  }: {
    id: string;
    message: string;
    from: MessagerEnum;
    attachments?: Buffer[] | string[];
  }) {
    if (from === MessagerEnum.MS_TEAMS) {
      return this.receiveMessageFromMSTeams({
        id,
        message,
        attachments,
      });
    } else {
      return this.receiveMessageFromWhatsapp({
        id,
        message,
        attachments,
      });
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

  private async receiveMessageFromWhatsapp({
    id: phone,
    message,
  }: {
    id: string;
    message: string;
    attachments?: Buffer[] | string[];
  }) {
    const { firstInteraction, user } = await this.isFirstInteraction(phone);

    const userRegistered = this.registerUserService.userRegistered(user);

    if (!userRegistered) {
      const { question, options } =
        await this.registerUserService.saveDataAndReturnNextQuestion(
          user,
          message,
          firstInteraction,
        );

      await this.whatsappService.sendMessage({
        id: phone,
        text: question,
        options,
      });

      return;
    }

    await this.customerServiceService.receiveMessageFromCustomer(user, message);
  }

  private async receiveMessageFromMSTeams({
    id,
    message,
    attachments,
  }: {
    id: string;
    message: string;
    attachments?: Buffer[] | string[];
  }) {
    const messageCleaned = String(message || '').trim();

    const { isCommand, command, extraDataCommand } =
      this.isCommand(messageCleaned);

    if (isCommand) {
      await this.executeCommandAction(command, extraDataCommand, id);
    } else {
      await this.customerServiceService.receiveMessageFromAttendant({
        attendantId: id,
        message: messageCleaned,
        attachments,
      });
    }
  }

  private isCommand(message: string) {
    const splittedMessage = message.split(' ');

    const firstWord = splittedMessage[0];

    const isCommand = possibleCommands.includes(firstWord as MappedCommands);

    const command = isCommand
      ? possibleCommands.find(
          (possibleCommand) =>
            possibleCommand === (firstWord as MappedCommands),
        )
      : null;

    const extraDataCommand = isCommand
      ? message.replace(firstWord, '').trim()
      : null;

    return {
      isCommand,
      command,
      extraDataCommand,
    };
  }

  private async executeCommandAction(
    command: MappedCommands,
    extraDataCommand: string,
    attendantId: string,
  ) {
    switch (command) {
      case MappedCommands.FINISH_SERVICE:
        return this.customerServiceService.finishService(attendantId);
      case MappedCommands.LIST_AVAILABLE_ATTENDANTS:
        return this.customerServiceService.listAvailableAttendants(attendantId);
      case MappedCommands.REGISTER_CUSTOMER:
        return this.customerServiceService.registerCustomer(
          attendantId,
          extraDataCommand,
        );
      case MappedCommands.TRANSFER_SERVICE:
        return this.customerServiceService.transferService(
          attendantId,
          extraDataCommand,
        );
      default:
        return this.msTeamsService.sendMessage({
          id: attendantId,
          text: `O comando ${command} ainda está indisponível`,
        });
    }
  }
}
