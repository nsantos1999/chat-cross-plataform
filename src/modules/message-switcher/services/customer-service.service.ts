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
import { ServiceGroupsIdsEnum } from '../constants/enums/service-groups-ids.enum';
import { instanceToInstance } from 'class-transformer';
import { RegisterUserCNPJDto } from '../dtos/register-user.dtos';
import { validate } from 'class-validator';
import { UserRepository } from '../repositories/user.repository';
import { MaskUtil } from 'src/utils/mask.utils';

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
    private readonly userRepository: UserRepository,
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
      `Seu atendimento foi encessado por ${openedService.attendantName}.`,
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

    await this.msTeamsService.sendMessage(
      attendantId,
      `Escolha o atendente que deseja transferir o atendimento`,
      availableAttendants.map((availableAttendant) => ({
        id: availableAttendant.user.aadObjectId,
        title: availableAttendant.user.name,
      })),
    );
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

  async registerCustomer(attendantId: string, message: string) {
    const openedService = await this.getOpenedServiceByAttendant(attendantId);

    if (!openedService) {
      await this.msTeamsService.sendMessage(
        attendantId,
        'Você não está atendendo nenhum chamado no momento',
      );
      return;
    }

    //TODO: Verificar se o atendente pode alterar o CNPJ

    const registerUserCNPJDto = new RegisterUserCNPJDto({ cnpj: message });
    const transformedData = instanceToInstance(registerUserCNPJDto);

    const validationResult = await validate(transformedData, {
      stopAtFirstError: true,
    });

    console.log(validationResult);

    if (validationResult[0]) {
      await this.msTeamsService.sendMessage(
        attendantId,
        Object.values(validationResult[0].constraints)[0],
      );
      return;
    }

    await this.userRepository.updateByPhone(openedService.customer.phone, {
      isCustomer: true,
      cnpj: Number(transformedData.cnpj),
    });

    await this.msTeamsService.sendMessage(
      attendantId,
      'CNPJ alterado com sucesso!',
    );

    await this.whatsappService.sendMessage(
      String(openedService.customer.phone),
      `O atendente ${openedService.attendantName} alterou seu cadastro. Agora você é um cliente, e seu CNPJ cadastrado é ${MaskUtil.formatCNPJ(transformedData.cnpj)}`,
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
        \nPortador do CNPJ: ${service.customer.cnpj ? MaskUtil.formatCNPJ(String(service.customer.cnpj)) : 'Não consta'}
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
    const serviceGroupId = this.getGroupId(customer);

    const service = await this.serviceRepository.createNew({
      customer,
      status: ServiceStatusEnum.SEARCHING_ATTENDANT,
      firstMessage: message,
      serviceGroupId,
    });

    await service.populate('customer');

    await this.whatsappService.sendMessage(
      String(customer.phone),
      'Estou procurando um atendente. Por favor aguarde',
    );

    await this.searchAttendant(service);

    return service;
  }

  private async searchAttendant(service: ServiceDocument) {
    await this.serviceRepository.changeStatus(
      service._id,
      ServiceStatusEnum.SEARCHING_ATTENDANT,
    );

    const groupUsers = await this.msTeamsApiGraphService.getGroupMembers(
      service.serviceGroupId,
    );

    console.log('groupUsers', groupUsers);

    const conversationReferencesWithoutService =
      await this.findAvailableAttendants(
        groupUsers.map((groupUser) => groupUser.id),
      );

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
        \nPortador do CNPJ: ${service.customer.cnpj ? MaskUtil.formatCNPJ(String(service.customer.cnpj)) : 'Não consta'}
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

  private async findAvailableAttendants(attendantsFilteredIds?: string[]) {
    const conversationReferences =
      await this.conversationReferenceRepository.findAll(attendantsFilteredIds);

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

  private getGroupId(user: User) {
    if (user.isCustomer) {
      return ServiceGroupsIdsEnum.ATENDIMENTO;
    }

    return ServiceGroupsIdsEnum.EXPANSAO;
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  private async searchAttendantToPendingServicesCron() {
    const pendingServices = await this.serviceRepository.findByStatus(
      ServiceStatusEnum.IN_QUEUE,
    );

    for (const pendingService of pendingServices) {
      Logger.log(`Find attendant to service: ${pendingService._id}`);
      await this.searchAttendant(pendingService);
    }
  }
}
