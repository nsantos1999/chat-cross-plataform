import { InjectModel } from '@nestjs/mongoose';
import { ServiceAttendantsHistories } from '../schemas/service-attendant-histories.schema';
import { Model, Types } from 'mongoose';
import { ServiceDocument } from '../schemas/service.schema';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ServiceAttendantsHistoriesRepository {
  constructor(
    @InjectModel(ServiceAttendantsHistories.name)
    private serviceAttendantsHistoriesModel: Model<ServiceAttendantsHistories>,
  ) {}

  async registerNewAttendant(
    service: ServiceDocument,
    attendantId: string,
    attendantName: string,
    attendantAadObjectId: string,
  ) {
    const servicesHistories = await this.findByService(service._id);

    await this.removeActualCheckServices(service._id);

    return this.serviceAttendantsHistoriesModel.create({
      attendantId,
      attendantName,
      attendantAadObjectId,
      round: servicesHistories.length + 1,
      service,
      isActual: true,
    });
  }

  findByService(serviceId: Types.ObjectId) {
    return this.serviceAttendantsHistoriesModel.find({ service: serviceId });
  }

  removeActualCheckServices(serviceId: Types.ObjectId) {
    return this.serviceAttendantsHistoriesModel.updateMany(
      { service: serviceId },
      { isActual: false },
    );
  }
}
