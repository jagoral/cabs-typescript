import * as dayjs from 'dayjs';
import { CarClass } from 'src/entity/car-type.entity';
import { DriverFee, FeeType } from 'src/entity/driver-fee.entity';
import { Driver, DriverStatus } from 'src/entity/driver.entity';
import { Status, Transit } from 'src/entity/transit.entity';
import { Money } from 'src/money/money';
import { DriverFeeRepository } from 'src/repository/driver-fee.repository';
import { TransitRepository } from 'src/repository/transit.repository';
import { DriverService } from 'src/service/driver.service';
import { createTestApp } from 'test/setup/test-server';

describe('Calculate Driver Periodic Payments', () => {
  let driverService: DriverService;
  let transitRepository: TransitRepository;
  let feeRepository: DriverFeeRepository;

  beforeEach(async () => {
    const app = await createTestApp();
    driverService = app.get(DriverService);
    transitRepository = app.get(TransitRepository);
    feeRepository = app.get(DriverFeeRepository);
  });

  it('should calculate monthly payment', async () => {
    //given
    const driver = await aDriver();
    //and
    await Promise.all([
      aTransit(driver, 60, dayjs('2000-10-01 06:30').toDate()),
      aTransit(driver, 70, dayjs('2000-10-10 02:30').toDate()),
      aTransit(driver, 80, dayjs('2000-10-30 06:30').toDate()),
      aTransit(driver, 60, dayjs('2000-11-10 01:30').toDate()),
      aTransit(driver, 30, dayjs('2000-11-10 01:30').toDate()),
      aTransit(driver, 15, dayjs('2000-12-10 02:30').toDate()),
    ]);
    //and
    await driverHasFee(driver, { feeType: FeeType.FLAT, amount: 10 });

    //when
    const feeOctober = await driverService.calculateDriverMonthlyPayment(
      driver.getId(),
      2000,
      9,
    );
    //then
    expect(feeOctober.toInt()).toEqual(180);

    //when
    const feeNovember = await driverService.calculateDriverMonthlyPayment(
      driver.getId(),
      2000,
      10,
    );
    //then
    expect(feeNovember.toInt()).toEqual(70);

    //when
    const feeDecember = await driverService.calculateDriverMonthlyPayment(
      driver.getId(),
      2000,
      11,
    );
    //then
    expect(feeDecember.toInt()).toEqual(5);
  });

  it('should calculate yearly payment', async () => {
    //given
    const driver = await aDriver();
    //and
    await Promise.all([
      aTransit(driver, 60, dayjs('2000-10-01 06:30').toDate()),
      aTransit(driver, 70, dayjs('2000-10-10 02:30').toDate()),
      aTransit(driver, 80, dayjs('2000-10-30 06:30').toDate()),
      aTransit(driver, 60, dayjs('2000-11-10 01:30').toDate()),
      aTransit(driver, 30, dayjs('2000-11-10 01:30').toDate()),
      aTransit(driver, 15, dayjs('2000-12-10 02:30').toDate()),
    ]);
    //and
    await driverHasFee(driver, { feeType: FeeType.FLAT, amount: 10 });

    const payments = await driverService.calculateDriverYearlyPayment(
      driver.getId(),
      2000,
    );

    expect(payments.get(1)?.toInt()).toEqual(0);
    expect(payments.get(2)?.toInt()).toEqual(0);
    expect(payments.get(3)?.toInt()).toEqual(0);
    expect(payments.get(4)?.toInt()).toEqual(0);
    expect(payments.get(5)?.toInt()).toEqual(0);
    expect(payments.get(6)?.toInt()).toEqual(0);
    expect(payments.get(7)?.toInt()).toEqual(0);
    expect(payments.get(8)?.toInt()).toEqual(0);
    expect(payments.get(9)?.toInt()).toEqual(180);
    expect(payments.get(10)?.toInt()).toEqual(70);
    expect(payments.get(11)?.toInt()).toEqual(5);
  });

  function aTransit(
    driver: Driver,
    price: number,
    when: Date,
  ): Promise<Transit> {
    const transit = new Transit();
    transit.setPrice(new Money(price));
    transit.setDriver(driver);
    transit.setDateTime(when.getTime());
    transit.setStatus(Status.DRAFT);
    transit.setCarType(CarClass.ECO);
    return transitRepository.save(transit);
  }

  function driverHasFee(
    driver: Driver,
    fee: { feeType: FeeType; amount: number; min?: number },
  ): Promise<DriverFee> {
    const driverFee = new DriverFee(
      fee.feeType,
      driver,
      fee.amount,
      fee.min || 0,
    );
    return feeRepository.save(driverFee);
  }

  function aDriver(): Promise<Driver> {
    return driverService.createDriver(
      {
        driverLicense: 'FARME100165AB5EW',
        firstName: 'Janusz',
        lastName: 'Kowalski',
        photo: 'c3RyaW5n',
      },
      DriverStatus.ACTIVE,
    );
  }
});
