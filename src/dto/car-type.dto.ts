import { CarClass, CarStatus, CarType } from '../entity/car-type.entity';

export class CarTypeDto {
  public readonly id: string;
  public readonly carClass: CarClass;

  public readonly description: string | null;

  public readonly status: CarStatus;

  public readonly carsCounter: number;

  public readonly minNoOfCarsToActivateClass: number;

  public readonly activeCarsCounter: number;

  constructor(carType: CarType, activeCarsCounter: number) {
    this.id = carType.getId();
    this.carClass = carType.getCarClass();
    this.status = carType.getStatus();
    this.description = carType.getDescription();
    this.carsCounter = carType.getCarsCounter();
    this.minNoOfCarsToActivateClass = carType.getMinNoOfCarsToActivateClass();
    this.activeCarsCounter = activeCarsCounter;
  }
}
