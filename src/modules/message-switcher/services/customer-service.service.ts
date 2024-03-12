import { Inject, Injectable, Logger } from '@nestjs/common';
import { ServiceRepository } from '../repositories/service.repository';
import { User, UserDocument } from '../schemas/user.schema';
import { ServiceStatusEnum } from '../constants/enums/service-status.enum';
import { messagerSenderProvider } from '../providers/messager.provider';
import { MessagerService } from './messager-sender.service';
import { Service, ServiceDocument } from '../schemas/service.schema';
import { ConversationReferenceRepository } from 'src/modules/microsoft-teams/repositories/conversation-reference.repository';
import {
  ConversationReference,
  ConversationReferenceDocument,
} from 'src/modules/microsoft-teams/schemas/conversation-reference.schema';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MessageRepository } from '../repositories/message.repository';
import { MessagerEnum } from '../constants/enums/messager.enum';
import { UserStatus } from 'src/modules/microsoft-teams/constants/enums/user-status.enum';
import { MSTeamsApiGraphService } from 'src/modules/microsoft-teams/service/ms-teams-api-graph.service';
import { ChannelAccount } from 'botbuilder';

@Injectable()
export class CustomerServiceService {
  constructor(
    @Inject(messagerSenderProvider.MessagerSender1.provide)
    private readonly whatsappService: MessagerService,

    @Inject(messagerSenderProvider.MessagerSender2.provide)
    private readonly msTeamsService: MessagerService,

    private readonly serviceRepository: ServiceRepository,
    private readonly conversationReferenceRepository: ConversationReferenceRepository,
    private readonly messageRepository: MessageRepository,
    private readonly msTeamsApiGraphService: MSTeamsApiGraphService,
  ) {}

  async receiveMessageFromCustomer(customer: UserDocument, message: string) {
    const openedService = await this.getOpenedServiceByCustomer(customer);

    if (!openedService) {
      return this.openService(customer, message);
    }

    await this.messageRepository.register({
      from: MessagerEnum.WHATSAPP,
      service: openedService,
      text: message,
      customer: openedService.customer,
    });

    return this.redirectMessageToAttendant(
      customer,
      message,
      openedService.attendantId,
    );
  }

  async receiveMessageFromAttendant(attendantId: string, message: string) {
    const openedService = await this.getOpenedServiceByAttendant(attendantId);

    if (!openedService) {
      await this.msTeamsService.sendMessage(
        attendantId,
        'Você não está atendendo nenhum chamado no momento',
      );
      return;
    }

    await this.messageRepository.register({
      from: MessagerEnum.MS_TEAMS,
      service: openedService,
      text: message,
      attendantId: openedService.attendantId,
      attendantName: openedService.attendantName,
      attendantAadObjectId: openedService.attendantAadObjectId,
    });
    return this.redirectMessageToCustomer(
      openedService.attendantName,
      message,
      openedService.customer,
    );
  }

  async finishService(attendantId: string) {
    const openedService = await this.getOpenedServiceByAttendant(attendantId);

    if (!openedService) {
      await this.msTeamsService.sendMessage(
        attendantId,
        'Você não está atendendo nenhum chamado no momento',
      );
      return;
    }

    await this.serviceRepository.finishService(openedService);

    const updatedService = await this.serviceRepository.findById(
      openedService._id,
    );

    await this.msTeamsService.sendMessage(
      attendantId,
      `O atendimento foi finalizado. O tempo de SLA foi de ${updatedService.slaMinutes} minutos`,
    );

    await this.whatsappService.sendMessage(
      String(openedService.customer.phone),
      'O atendimento foi finalizado pelo atendente.',
    );
  }

  async listAvailableAttendants(attendantId: string) {
    const availableAttendants = await this.findAvailableAttendants();

    if (availableAttendants.length === 0) {
      await this.msTeamsService.sendMessage(
        attendantId,
        'Nenhum atendente disponível no momento',
      );
      return;
    }

    let message = 'Atendentes disponíveis:';

    availableAttendants.forEach((availableAttendant) => {
      if (message) {
        message += '<br/><br/>';
      }

      message += `Nome: ${availableAttendant.user.name} \n\nID: ${availableAttendant.user.aadObjectId}`;
    });

    await this.msTeamsService.sendMessage(attendantId, message);
  }

  async transferService(attendantId: string, attendantToTransfer: string) {
    const openedService = await this.getOpenedServiceByAttendant(attendantId);

    if (!openedService) {
      await this.msTeamsService.sendMessage(
        attendantId,
        'Você não está atendendo nenhum chamado no momento',
      );
      return;
    }

    const conversationReferenteOfOldAttendant =
      await this.conversationReferenceRepository.findByUser(attendantId);

    const conversationReferenteOfNewAttendant =
      await this.conversationReferenceRepository.findByUser(
        attendantToTransfer,
      );

    if (!conversationReferenteOfNewAttendant) {
      await this.msTeamsService.sendMessage(
        attendantId,
        `Não encontramos este usuários`,
      );
      return;
    }

    const attendantToTransferIsAvailable = await this.checkAttendantAvailable(
      conversationReferenteOfNewAttendant,
    );

    if (!attendantToTransferIsAvailable) {
      await this.msTeamsService.sendMessage(
        attendantId,
        `O atendente ${conversationReferenteOfNewAttendant.user.name} não está disponível no momento`,
      );
      return;
    }

    await this.serviceRepository.transferAttendant(openedService, {
      attendantAadObjectId:
        conversationReferenteOfNewAttendant.user.aadObjectId,
      attendantId: conversationReferenteOfNewAttendant.user.id,
      attendantName: conversationReferenteOfNewAttendant.user.name,
    });

    await this.notifyTransferService(
      conversationReferenteOfOldAttendant.user,
      conversationReferenteOfNewAttendant.user,
      openedService,
    );
  }

  private async notifyTransferService(
    oldAttendant: ChannelAccount,
    newAttendant: ChannelAccount,
    service: Service,
  ) {
    await this.msTeamsService.sendMessage(
      newAttendant.id,
      `O atendente ${oldAttendant.name} transferiu um atendimento a você.
        \nO nome do cliente é: ${service.customer.name} 
        \nÉ um cliente: ${service.customer.isCustomer ? 'Sim' : 'Não'} 
        \nPortador do CNPJ: ${service.customer.cnpj ? service.customer.cnpj : 'Não consta'}
        \nSua mensagem foi: ${service.firstMessage}`,
    );

    await this.msTeamsService.sendMessage(
      oldAttendant.id,
      `O atendente ${newAttendant.name} recebeu o atendimento e irá continuar`,
    );

    await this.whatsappService.sendMessage(
      String(service.customer.phone),
      `O atendimento foi transferido. Quem irá te atender agora é ${newAttendant.name}`,
    );
  }

  private getOpenedServiceByCustomer(customer: UserDocument) {
    return this.serviceRepository.getOpenedServiceByCustomer(customer);
  }

  private getOpenedServiceByAttendant(attendantId: string) {
    return this.serviceRepository.getOpenedServiceByAttendant(attendantId);
  }

  private async redirectMessageToAttendant(
    customer: User,
    message: string,
    attendantId: string,
  ) {
    this.msTeamsService.sendMessage(
      attendantId,
      `${customer.name} disse: <br/><br/>${message}`,
    );
  }

  private async redirectMessageToCustomer(
    attendantName: string,
    message: string,
    customer: User,
  ) {
    this.whatsappService.sendMessage(
      String(customer.phone),
      `${attendantName} disse: \n\n${message}`,
    );
  }

  private async openService(customer: User, message: string) {
    const service = await this.serviceRepository.createNew({
      customer,
      status: ServiceStatusEnum.SEARCHING_ATTENDANT,
      firstMessage: message,
    });

    await service.populate('customer');

    await this.whatsappService.sendMessage(
      String(customer.phone),
      'Estamos procurando um atendente. Por favor aguarde',
    );

    await this.searchAttendant(service);

    return service;
  }

  private async searchAttendant(service: ServiceDocument) {
    await this.serviceRepository.changeStatus(
      service._id,
      ServiceStatusEnum.SEARCHING_ATTENDANT,
    );

    const conversationReferencesWithoutService =
      await this.findAvailableAttendants();

    if (conversationReferencesWithoutService.length > 0) {
      const chosenAttendant = this.chooseAttendantToService(
        conversationReferencesWithoutService,
      );

      await this.serviceRepository.startService(service, {
        attendantId: chosenAttendant.user.id,
        attendantName: chosenAttendant.user.name,
        attendantAadObjectId: chosenAttendant.user.aadObjectId,
      });

      await this.msTeamsService.sendMessage(
        chosenAttendant.user.id,
        `Você iniciou um atendimento. 
        \nO nome do cliente é: ${service.customer.name} 
        \nÉ um cliente: ${service.customer.isCustomer ? 'Sim' : 'Não'} 
        \nPortador do CNPJ: ${service.customer.cnpj ? service.customer.cnpj : 'Não consta'}
        \nSua mensagem foi: ${service.firstMessage}`,
      );
      await this.whatsappService.sendMessage(
        String(service.customer.phone),
        `${chosenAttendant.user.name} iniciou seu atendimento`,
      );
    } else {
      await this.serviceRepository.changeStatus(
        service._id,
        ServiceStatusEnum.IN_QUEUE,
      );
    }
  }

  private async findAvailableAttendants() {
    const conversationReferences =
      await this.conversationReferenceRepository.findAll();

    const conversationReferencesWithoutService: ConversationReference[] = [];
    const conversationReferencesAvailable: ConversationReference[] = [];

    await Promise.all(
      conversationReferences.map(async (conversationReference) => {
        const attendantIsAvailable = await this.checkAttendantWithoutService(
          conversationReference,
        );

        if (attendantIsAvailable) {
          conversationReferencesWithoutService.push(conversationReference);
        }
      }),
    );

    const usersStatus = await this.msTeamsApiGraphService.getUsersStatus(
      conversationReferencesWithoutService.map(
        (conversationReference) => conversationReference.user.aadObjectId,
      ),
    );

    console.log(usersStatus);

    conversationReferencesWithoutService.forEach((conversationReference) => {
      const userStatus = usersStatus.find(
        (userStatusItem) =>
          userStatusItem.id === conversationReference.user.aadObjectId,
      );

      if (userStatus && userStatus.availability === UserStatus.AVAILABLE) {
        return conversationReferencesAvailable.push(conversationReference);
      }
    });

    return conversationReferencesAvailable;
  }

  private async checkAttendantAvailable(
    conversationReference: ConversationReferenceDocument,
  ) {
    const serviceWithAttendant =
      await this.serviceRepository.getOpenedServiceByAttendant(
        conversationReference.user.id,
      );

    const status = await this.msTeamsApiGraphService.getUserStatus(
      conversationReference.user.aadObjectId,
    );

    if (serviceWithAttendant) {
      return false;
    }

    // const status = await this.msTeamsApiGraphService.getUserStatus(userId);

    if (status !== UserStatus.AVAILABLE) {
      return false;
    }

    return true;
  }

  private async checkAttendantWithoutService(
    conversationReference: ConversationReferenceDocument,
  ) {
    const userId = conversationReference.user.id;
    const serviceWithAttendant =
      await this.serviceRepository.getOpenedServiceByAttendant(userId);

    if (serviceWithAttendant) {
      return false;
    }

    return true;
  }

  private chooseAttendantToService(
    conversationReferences: ConversationReference[],
  ) {
    const endIndex = conversationReferences.length - 1;
    // INFO: Regra de escolha no caso de varios atendentes disponível é feito na sorte
    const sortedIndexAttendant = Math.floor(
      Math.random() * (endIndex - 0 + 1) + 0,
    );

    console.log(
      'sortedIndexAttendant',
      sortedIndexAttendant,
      conversationReferences.length,
    );

    return conversationReferences[sortedIndexAttendant];
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async searchAttendantToPendingServicesCron() {
    const pendingServices = await this.serviceRepository.findByStatus(
      ServiceStatusEnum.IN_QUEUE,
    );

    for (const pendingService of pendingServices) {
      Logger.log(`Find attendant to service: ${pendingService._id}`);
      await this.searchAttendant(pendingService);
    }
  }
}
