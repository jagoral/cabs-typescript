import { BaseEntity } from '../common/base.entity';
import { Driver } from './driver.entity';
import { Column, Entity, OneToOne } from 'typeorm';
import { Money, moneyColumnTransformer } from 'src/money/money';

export enum FeeType {
  FLAT = 'flat',
  PERCENTAGE = 'percentage',
}

@Entity()
export class DriverFee extends BaseEntity {
  @Column()
  private feeType: FeeType;

  @Column()
  private amount: number;

  @Column({
    default: 0,
    type: 'integer',
    transformer: moneyColumnTransformer,
  })
  private min: Money;

  @OneToOne(() => Driver, (driver) => driver.fee)
  public driver: Driver;

  constructor(feeType: FeeType, driver: Driver, amount: number, min: number) {
    super();
    this.feeType = feeType;
    this.driver = driver;
    this.amount = amount;
    this.min = new Money(min);
  }

  public getFeeType() {
    return this.feeType;
  }

  public setFeeType(feeType: FeeType) {
    this.feeType = feeType;
  }

  public getDriver() {
    return this.driver;
  }

  public setDriver(driver: Driver) {
    this.driver = driver;
  }

  public getAmount() {
    return this.amount;
  }

  public setAmount(amount: number) {
    this.amount = amount;
  }

  public getMin() {
    return this.min;
  }

  public setMin(min: Money) {
    this.min = min;
  }
}
