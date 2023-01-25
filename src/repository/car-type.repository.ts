import { EntityRepository, Repository, UpdateResult } from 'typeorm';
import { CarClass, CarStatus, CarType } from '../entity/car-type.entity';
import { NotFoundException } from '@nestjs/common';
import { CarTypeActiveCounter } from 'src/entity/car-type-active-counter.entity';

@EntityRepository(CarType)
export class CarTypeRepository extends Repository<CarType> {
  public async findByCarClass(carClass: CarClass): Promise<CarType> {
    const carType = await this.findOne({ where: { carClass } });

    if (!carType) {
      throw new NotFoundException('Cannot find car type');
    }
    return carType;
  }

  public async findByStatus(status: CarStatus): Promise<CarType[]> {
    return this.find({ where: { status } });
  }
}

@EntityRepository(CarTypeActiveCounter)
export class CarTypeActiveCounterRepository extends Repository<CarTypeActiveCounter> {
  public incrementCounter(carClass: CarClass): Promise<UpdateResult> {
    return this.increment({ carClass }, 'activeCarsCounter', 1);
  }

  public decrementCounter(carClass: CarClass): Promise<UpdateResult> {
    return this.decrement({ carClass }, 'activeCarsCounter', 1);
  }
}
