import { CarClass } from 'src/entity/car-type.entity';
import { DriverFee, FeeType } from 'src/entity/driver-fee.entity';
import { Driver, DriverStatus } from 'src/entity/driver.entity';
import { Status, Transit } from 'src/entity/transit.entity';
import { Money } from 'src/money/money';
import { DriverFeeRepository } from 'src/repository/driver-fee.repository';
import { TransitRepository } from 'src/repository/transit.repository';
import { DriverFeeService } from 'src/service/driver-fee.service';
import { DriverService } from 'src/service/driver.service';
import { createTestApp } from 'test/setup/test-server';

describe('Calculate Driver Fee', () => {
  let driverFeeService: DriverFeeService;
  let driverService: DriverService;
  let transitRepository: TransitRepository;
  let feeRepository: DriverFeeRepository;

  beforeEach(async () => {
    const app = await createTestApp();
    driverFeeService = app.get(DriverFeeService);
    driverService = app.get(DriverService);
    transitRepository = app.get(TransitRepository);
    feeRepository = app.get(DriverFeeRepository);
  });

  it('should calculate drivers flat fee', async () => {
    //given
    const driver = await aDriver();
    //and
    const transit = await aTransit(driver, 60);
    //and
    await driverHasFee(driver, { feeType: FeeType.FLAT, amount: 10 });

    //when
    const fee = await driverFeeService.calculateDriverFee(transit.getId());

    //then
    expect(fee.toInt()).toEqual(50);
  });

  it('should calculate drivers percentage fee', async () => {
    //given
    const driver = await aDriver();
    //and
    const transit = await aTransit(driver, 80);
    //and
    await driverHasFee(driver, { feeType: FeeType.PERCENTAGE, amount: 50 });

    //when
    const fee = await driverFeeService.calculateDriverFee(transit.getId());

    //then
    expect(fee.toInt()).toEqual(40);
  });

  it('should use minimum fee', async () => {
    //given
    const driver = await aDriver();
    //and
    const transit = await aTransit(driver, 10);
    //and
    await driverHasFee(driver, {
      feeType: FeeType.PERCENTAGE,
      amount: 7,
      min: 5,
    });

    //when
    const fee = await driverFeeService.calculateDriverFee(transit.getId());

    //then
    expect(fee.toInt()).toEqual(5);
  });

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

  function aTransit(driver: Driver, price: number): Promise<Transit> {
    const transit = new Transit();
    transit.setPrice(new Money(price));
    transit.setDriver(driver);
    transit.setDateTime(new Date(2020, 10, 20).getTime());
    transit.setStatus(Status.DRAFT);
    transit.setCarType(CarClass.ECO);
    return transitRepository.save(transit);
  }
});
