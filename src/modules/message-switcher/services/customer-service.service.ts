import { Inject, Injectable, Logger } from '@nestjs/common';
import { ServiceRepository } from '../repositories/service.repository';
import { User, UserDocument } from '../schemas/user.schema';
import { ServiceStatusEnum } from '../constants/enums/service-status.enum';
import { messagerSenderProvider } from '../providers/messager.provider';
import { MessagerService } from './messager-sender.service';
import { ServiceDocument } from '../schemas/service.schema';
import { ConversationReferenceRepository } from 'src/modules/microsoft-teams/repositories/conversation-reference.repository';
import { ConversationReference } from 'src/modules/microsoft-teams/schemas/conversation-reference.schema';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class CustomerServiceService {
  constructor(
    @Inject(messagerSenderProvider.MessagerSender1.provide)
    private readonly whatsappService: MessagerService,

    @Inject(messagerSenderProvider.MessagerSender2.provide)
    private readonly msTeamsService: MessagerService,

    private readonly serviceRepository: ServiceRepository,

    private readonly conversationReferenceRepository: ConversationReferenceRepository,
  ) {}

  async receiveMessageFromCustomer(customer: UserDocument, message: string) {
    const openedService = await this.getOpenedServiceByCustomer(customer);

    if (!openedService) {
      return this.openService(customer, message);
    }

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

    return this.redirectMessageToCustomer(
      openedService.attendantName,
      message,
      openedService.customer,
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
      `${customer.name} disse: \n\n${message}`,
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

    return;
  }

  private async searchAttendant(service: ServiceDocument) {
    const conversationReferences =
      await this.conversationReferenceRepository.findAll();

    const conversationReferencesWithoutService: ConversationReference[] = [];

    await Promise.all(
      conversationReferences.map(async (conversationReference) => {
        const serviceWithAttendant =
          await this.serviceRepository.findByAttendentId(
            conversationReference.user.id,
          );

        if (!serviceWithAttendant) {
          conversationReferencesWithoutService.push(conversationReference);
        }
      }),
    );

    if (conversationReferencesWithoutService.length > 0) {
      const chosenAttendant = this.chooseAttendantToService(
        conversationReferencesWithoutService,
      );

      await this.serviceRepository.startService(service, {
        attendantId: chosenAttendant.user.id,
        attendantName: chosenAttendant.user.name,
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
    }
  }

  private chooseAttendantToService(
    conversationReferences: ConversationReference[],
  ) {
    //TODO: Apply balancing rule
    return conversationReferences[0];
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  async searchAttendantToPendingServicesCron() {
    const pendingServices = await this.serviceRepository.findByStatus(
      ServiceStatusEnum.SEARCHING_ATTENDANT,
    );

    for (const pendingService of pendingServices) {
      Logger.log(`Find attendant to service: ${pendingService._id}`);
      await this.searchAttendant(pendingService);
    }
  }
}
