import { Column, Entity, PrimaryColumn } from 'typeorm';
import { CarClass } from './car-type.entity';

@Entity()
export class CarTypeActiveCounter {
  @PrimaryColumn({ enum: CarClass, type: 'enum' })
  public readonly carClass: CarClass;

  @Column({ type: 'int', default: 0 })
  private activeCarsCounter: number;

  constructor(carClass: CarClass) {
    this.carClass = carClass;
  }

  public getActiveCarsCounter(): number {
    return this.activeCarsCounter;
  }
}
