import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Service, ServiceDocument } from '../schemas/service.schema';
import { Model } from 'mongoose';
import { UserDocument } from '../schemas/user.schema';
import { ServiceStatusEnum } from '../constants/enums/service-status.enum';

@Injectable()
export class ServiceRepository {
  constructor(
    @InjectModel(Service.name)
    private serviceModel: Model<Service>,
  ) {}

  createNew(service: Service) {
    return this.serviceModel.create(service);
  }

  startService(
    service: ServiceDocument,
    attendant: { attendantId: string; attendantName: string },
  ) {
    const { attendantId, attendantName } = attendant;
    console.log('start service');
    return this.serviceModel.updateOne(
      { _id: service._id },
      {
        attendantId,
        attendantName,
        status: ServiceStatusEnum.RUNNING,
      },
    );
  }

  getOpenedServiceByCustomer(customer: UserDocument) {
    return this.serviceModel
      .findOne({ customer: customer._id })
      .populate('customer');
  }

  getOpenedServiceByAttendant(attendantId: string) {
    return this.serviceModel.findOne({ attendantId }).populate('customer');
  }

  findByAttendentId(attendantId: string) {
    return this.serviceModel.findOne({ attendantId }).populate('customer');
  }

  findByStatus(status: ServiceStatusEnum) {
    return this.serviceModel.find({ status }).populate('customer');
  }
}
