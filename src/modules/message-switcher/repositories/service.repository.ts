import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Service, ServiceDocument } from '../schemas/service.schema';
import { Model, Types } from 'mongoose';
import { UserDocument } from '../schemas/user.schema';
import { ServiceStatusEnum } from '../constants/enums/service-status.enum';
import { ServiceAttendantsHistoriesRepository } from './service-attendant-histories.repository';
import { differenceInMinutes } from 'date-fns';

@Injectable()
export class ServiceRepository {
  constructor(
    @InjectModel(Service.name)
    private serviceModel: Model<Service>,

    private serviceAttendantsHistoriesRepository: ServiceAttendantsHistoriesRepository,
  ) {}

  createNew(service: Service) {
    return this.serviceModel.create(service);
  }

  async startService(
    service: ServiceDocument,
    attendant: {
      attendantId: string;
      attendantName: string;
      attendantAadObjectId: string;
    },
  ) {
    const { attendantId, attendantName, attendantAadObjectId } = attendant;

    const startedService = await this.serviceModel.updateOne(
      { _id: service._id },
      {
        attendantId,
        attendantName,
        attendantAadObjectId,
        startedAt: new Date(),
        status: ServiceStatusEnum.RUNNING,
      },
    );

    await this.serviceAttendantsHistoriesRepository.registerNewAttendant(
      service,
      attendantId,
      attendantName,
      attendantAadObjectId,
      'mocked-sector',
    );

    return startedService;
  }

  async changeStatus(
    serviceId: Types.ObjectId | string,
    status: ServiceStatusEnum,
  ) {
    return this.serviceModel.updateOne(
      { _id: serviceId },
      {
        status,
      },
    );
  }

  async transferAttendant(
    service: ServiceDocument,
    attendant: {
      attendantId: string;
      attendantName: string;
      attendantAadObjectId: string;
    },
  ) {
    const { attendantId, attendantName, attendantAadObjectId } = attendant;

    const startedService = await this.serviceModel.updateOne(
      { _id: service._id },
      {
        attendantId,
        attendantName,
        attendantAadObjectId,
      },
    );

    await this.serviceAttendantsHistoriesRepository.registerNewAttendant(
      service,
      attendantId,
      attendantName,
      attendantAadObjectId,
      'mocked-sector',
    );

    return startedService;
  }

  finishService(service: ServiceDocument) {
    return this.serviceModel.updateOne(
      { _id: service._id },
      {
        slaMinutes: differenceInMinutes(
          new Date(),
          new Date(service.startedAt),
        ),
        status: ServiceStatusEnum.FINISHED,
      },
    );
  }

  getOpenedServiceByCustomer(customer: UserDocument) {
    return this.serviceModel
      .findOne({ customer: customer._id, status: ServiceStatusEnum.RUNNING })
      .populate('customer');
  }

  getOpenedServiceByAttendant(attendantId: string) {
    return this.serviceModel
      .findOne({ attendantId, status: ServiceStatusEnum.RUNNING })
      .populate('customer');
  }

  findByAttendentId(attendantId: string) {
    return this.serviceModel
      .findOne({ attendantId, status: ServiceStatusEnum.RUNNING })
      .populate('customer');
  }

  findByStatus(status: ServiceStatusEnum) {
    return this.serviceModel.find({ status }).populate('customer');
  }
  findById(_id: Types.ObjectId | string) {
    return this.serviceModel.findOne({ _id }).populate('customer');
  }
}
