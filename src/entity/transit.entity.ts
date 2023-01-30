import { Distance } from './../distance/distance';
import { ForbiddenException, NotAcceptableException } from '@nestjs/common';
import { BaseEntity } from '../common/base.entity';
import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Driver } from './driver.entity';
import { Client, PaymentType } from './client.entity';
import { Address } from './address.entity';
import { CarClass } from './car-type.entity';
import { Money, moneyColumnTransformer } from 'src/money/money';
import { Tariff } from './tariff';
import * as dayjs from 'dayjs';
import { isInArray } from 'src/common/array.utils';
import { Claim } from './claim.entity';

export enum Status {
  DRAFT = 'draft',
  CANCELLED = 'cancelled',
  WAITING_FOR_DRIVER_ASSIGNMENT = 'waiting_for_driver_assignment',
  DRIVER_ASSIGNMENT_FAILED = 'driver_assignment_failed',
  TRANSIT_TO_PASSENGER = 'transit_to_passenger',
  IN_TRANSIT = 'in_transit',
  COMPLETED = 'completed',
}

export enum DriverPaymentStatus {
  NOT_PAID = 'not_paid',
  PAID = 'paid',
  CLAIMED = 'claimed',
  RETURNED = 'returned',
}

export enum ClientPaymentStatus {
  NOT_PAID = 'not_paid',
  PAID = 'paid',
  RETURNED = 'returned',
}

export enum Month {
  JANUARY,
  FEBRUARY,
  MARCH,
  APRIL,
  MAY,
  JUNE,
  JULY,
  AUGUST,
  SEPTEMBER,
  OCTOBER,
  NOVEMBER,
  DECEMBER,
}

export enum DayOfWeek {
  SUNDAY,
  MONDAY,
  TUESDAY,
  WEDNESDAY,
  THURSDAY,
  FRIDAY,
  SATURDAY,
}

interface TransitConstructor {
  from: Address;
  to: Address;
  client: Client;
  carClass: CarClass;
  when: Date;
  distance: Distance;
}

type TransitTestConstructor = { status: Status } & TransitConstructor;

function isTransitTestConstructor(
  input: TransitConstructor | TransitTestConstructor,
): input is TransitTestConstructor {
  return !!(input as TransitTestConstructor).status;
}

@Entity()
export class Transit extends BaseEntity {
  @ManyToOne(() => Driver, (driver) => driver.transits, { eager: true })
  public driver: Driver | null;

  @Column({ nullable: true })
  private driverPaymentStatus: DriverPaymentStatus;

  @Column({ nullable: true })
  private clientPaymentStatus: ClientPaymentStatus;

  @Column({ nullable: true })
  private paymentType: PaymentType;

  @Column()
  private status: Status;

  @Column({ type: 'bigint', nullable: true })
  private date: number;

  @ManyToOne(() => Address, { eager: true })
  @JoinColumn()
  private from: Address;

  @ManyToOne(() => Address, { eager: true })
  @JoinColumn()
  private to: Address;

  @Column({ nullable: true, type: 'bigint' })
  public acceptedAt: number | null;

  @Column({ nullable: true, type: 'bigint' })
  public started: number | null;

  @Column({ default: 0 })
  public pickupAddressChangeCounter: number;

  @ManyToMany(() => Driver)
  @JoinTable()
  public driversRejections: Driver[];

  @ManyToMany(() => Driver)
  @JoinTable()
  public proposedDrivers: Driver[];

  @Column({ default: 0, type: 'integer' })
  public awaitingDriversResponses: number;

  @Column({ nullable: false, default: 0 })
  private km: number;

  @Column(() => Tariff)
  private tariff: Tariff;

  // https://stackoverflow.com/questions/37107123/sould-i-store-price-as-decimal-or-integer-in-mysql
  @Column({
    nullable: true,
    type: 'integer',
    transformer: moneyColumnTransformer,
  })
  private price: Money | null;

  @Column({
    nullable: true,
    type: 'integer',
    transformer: moneyColumnTransformer,
  })
  private estimatedPrice: Money | null;

  @Column({
    nullable: true,
    type: 'integer',
    transformer: moneyColumnTransformer,
  })
  private driversFee: Money;

  @Column({ type: 'bigint' })
  public dateTime: number;

  @Column({ type: 'bigint', nullable: true })
  private published: number;

  @ManyToOne(() => Client, { eager: true })
  @JoinColumn()
  private client: Client;

  @Column({ nullable: true })
  private carType: CarClass;

  @Column({ type: 'bigint', nullable: true })
  private completeAt: number;

  @OneToMany(() => Claim, (claim) => claim.transit)
  public claims: Claim[];

  constructor(input?: TransitConstructor | TransitTestConstructor) {
    super();
    if (!input) {
      return;
    }
    this.from = input.from;
    this.to = input.to;
    this.carType = input.carClass;
    this.setDateTime(input.when.getTime());
    this.client = input.client;
    this.km = input.distance.toKmInNumber();
    this.estimateCost();
    this.awaitingDriversResponses = 0;
    this.pickupAddressChangeCounter = 0;
    if (isTransitTestConstructor(input)) {
      this.status = input.status;
    } else {
      this.status = Status.DRAFT;
    }
  }

  public getCarType() {
    return this.carType as CarClass;
  }

  public setCarType(carType: CarClass) {
    this.carType = carType;
  }

  public getDriver() {
    return this.driver;
  }

  public getPrice() {
    return this.price;
  }

  //just for testing
  public setPrice(price: Money) {
    this.price = price;
  }

  public getStatus() {
    return this.status;
  }

  public getCompleteAt() {
    return this.completeAt;
  }

  public getClient() {
    return this.client;
  }

  public setDateTime(dateTime: number) {
    this.tariff = Tariff.ofTime(dateTime);
    this.dateTime = dateTime;
  }

  public getDateTime() {
    return +this.dateTime;
  }

  public getPublished() {
    return +this.published;
  }

  public getKm() {
    return Distance.ofKm(this.km);
  }

  public getAwaitingDriversResponses() {
    return this.awaitingDriversResponses;
  }

  public getProposedDrivers() {
    return this.proposedDrivers || [];
  }

  public getAcceptedAt() {
    return this.acceptedAt;
  }

  public getStarted() {
    return this.started;
  }

  public getFrom() {
    return this.from;
  }

  public getTo() {
    return this.to;
  }

  public getDriversFee() {
    return this.driversFee;
  }

  public setDriversFee(driversFee: Money) {
    this.driversFee = driversFee;
  }

  public getEstimatedPrice() {
    return this.estimatedPrice;
  }

  public setEstimatedPrice(estimatedPrice: Money) {
    this.estimatedPrice = estimatedPrice;
  }

  public estimateCost() {
    if (this.status === Status.COMPLETED) {
      throw new ForbiddenException(
        'Estimating cost for completed transit is forbidden, id = ' +
          this.getId(),
      );
    }

    this.estimatedPrice = this.calculateCost();

    this.price = null;

    return this.estimatedPrice;
  }

  public calculateFinalCosts(): Money {
    if (this.status === Status.COMPLETED) {
      return this.calculateCost();
    } else {
      throw new ForbiddenException(
        'Cannot calculate final cost if the transit is not completed',
      );
    }
  }

  public getTariff(): Tariff {
    return this.tariff;
  }

  public changePickupTo(
    newAddress: Address,
    distance: Distance,
    distanceFromPreviousPickup: number,
  ): void {
    if (
      (this.status !== Status.DRAFT &&
        this.status !== Status.WAITING_FOR_DRIVER_ASSIGNMENT) ||
      this.pickupAddressChangeCounter > 2 ||
      distanceFromPreviousPickup > 0.25
    ) {
      throw new NotAcceptableException(
        "Address 'from' cannot be changed, id = " + this.getId(),
      );
    }

    this.from = newAddress;
    this.km = distance.toKmInNumber();
    this.estimateCost();
    this.pickupAddressChangeCounter++;
  }

  public cancel(): void {
    if (
      ![
        Status.DRAFT,
        Status.WAITING_FOR_DRIVER_ASSIGNMENT,
        Status.TRANSIT_TO_PASSENGER,
      ].includes(this.status)
    ) {
      throw new NotAcceptableException(
        'Transit cannot be cancelled, id = ' + this.getId(),
      );
    }

    this.status = Status.CANCELLED;
    this.driver = null;
    this.km = Distance.ZERO.toKmInNumber();
    this.awaitingDriversResponses = 0;
  }

  public changeDestinationTo(newAddress: Address, newDistance: Distance): void {
    if (this.status === Status.COMPLETED) {
      throw new NotAcceptableException(
        "Address 'to' cannot be changed, id = " + this.getId(),
      );
    }

    this.to = newAddress;
    this.km = newDistance.toKmInNumber();
    this.estimateCost();
  }

  public publishAt(when: Date): void {
    this.status = Status.WAITING_FOR_DRIVER_ASSIGNMENT;
    this.published = when.getTime();
  }

  public completeTransitAt(
    when: Date,
    destinationAddress: Address,
    distance: Distance,
  ): void {
    if (this.status === Status.IN_TRANSIT) {
      // FIXME later: add some exceptions handling

      this.to = destinationAddress;
      this.km = distance.toKmInNumber();
      this.estimateCost();
      this.status = Status.COMPLETED;
      this.completeAt = when.getTime();
      this.calculateFinalCosts();
    } else {
      throw new NotAcceptableException(
        'Cannot complete Transit, id = ' + this.getId(),
      );
    }
  }

  public shouldNotWaitForDriverAnyMore(date: Date): boolean {
    return (
      this.status === Status.CANCELLED ||
      dayjs(+this.getPublished())
        .add(300, 'seconds')
        .isBefore(date)
    );
  }

  public failDriverAssignment(): void {
    this.status = Status.DRIVER_ASSIGNMENT_FAILED;
    this.driver = null;
    this.km = Distance.ZERO.toKmInNumber();
    this.awaitingDriversResponses = 0;
  }

  public canProposeTo(driver: Driver): boolean {
    return !isInArray(this.driversRejections || [], driver);
  }

  public proposeTo(driver: Driver): void {
    if (this.canProposeTo(driver)) {
      this.proposedDrivers = [...this.getProposedDrivers(), driver];
      this.awaitingDriversResponses++;
    }
  }

  public acceptBy(driver: Driver, date: Date): void {
    if (this.driver) {
      throw new NotAcceptableException(
        'Transit already accepted, id = ' + this.getId(),
      );
    } else {
      if (!isInArray(this.getProposedDrivers(), driver)) {
        throw new NotAcceptableException(
          'Driver out of possible drivers, id = ' + this.getId(),
        );
      } else {
        if (isInArray(this.driversRejections || [], driver)) {
          throw new NotAcceptableException(
            'Driver out of possible drivers, id = ' + this.getId(),
          );
        } else {
          this.driver = driver;
          this.awaitingDriversResponses = 0;
          this.acceptedAt = date.getTime();
          this.status = Status.TRANSIT_TO_PASSENGER;
        }
      }
    }
  }

  public start(date: Date): void {
    if (this.status !== Status.TRANSIT_TO_PASSENGER) {
      throw new NotAcceptableException(
        'Transit cannot be started, id = ' + this.getId(),
      );
    }

    this.status = Status.IN_TRANSIT;
    this.started = date.getTime();
  }

  public reject(driver: Driver): void {
    this.driversRejections = [...(this.driversRejections || []), driver];
    this.awaitingDriversResponses--;
  }

  private calculateCost(): Money {
    const price = this.tariff.calculateCost(Distance.ofKm(this.km));
    this.price = price;
    return price;
  }
}
