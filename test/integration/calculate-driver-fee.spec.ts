import { FeeType } from 'src/entity/driver-fee.entity';
import { DriverFeeService } from 'src/service/driver-fee.service';
import { aDriver, aTransit, driverHasFee } from 'test/common/fixtures';
import { createTestApp } from 'test/setup/test-server';

describe('Calculate Driver Fee', () => {
  let driverFeeService: DriverFeeService;

  beforeEach(async () => {
    const app = await createTestApp();
    driverFeeService = app.get(DriverFeeService);
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
});
