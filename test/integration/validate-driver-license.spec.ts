import { ForbiddenException, NotAcceptableException } from '@nestjs/common';
import { DriverDto } from 'src/dto/driver.dto';
import { Driver, DriverStatus } from 'src/entity/driver.entity';
import { DriverService } from 'src/service/driver.service';
import { createTestApp } from 'test/setup/test-server';

describe('Validate Driver License', () => {
  let driverService: DriverService;

  beforeEach(async () => {
    const app = await createTestApp();
    driverService = app.get<DriverService>(DriverService);
  });

  it('should not create active driver with invalid license', async () => {
    //expect
    await expect(
      createActiveDriverWithLicense('invalidLicense'),
    ).rejects.toThrow(NotAcceptableException);
  });

  it('should create active driver with valid license', async () => {
    //when
    const driver = await createActiveDriverWithLicense('FARME100165AB5EW');

    //then
    const driverDto = await load(driver);
    expect(driverDto.driverLicense).toEqual('FARME100165AB5EW');
    expect(driverDto.status).toEqual(DriverStatus.ACTIVE);
  });

  it('should create inactive driver with invalid license', async () => {
    //when
    const driver = await createInactiveDriverWithLicense('invalidlicense');

    //then
    const driverDto = await load(driver);
    expect(driverDto.driverLicense).toEqual('invalidlicense');
    expect(driverDto.status).toEqual(DriverStatus.INACTIVE);
  });

  it('should change license for valid one', async () => {
    //given
    const driver = await createActiveDriverWithLicense('FARME100165AB5EW');

    //when
    await changeLicenseTo('99999740614992TL', driver);

    //then
    const driverDto = await load(driver);
    expect(driverDto.driverLicense).toEqual('99999740614992TL');
  });

  it('should not change license for invalid one', async () => {
    //given
    const driver = await createActiveDriverWithLicense('FARME100165AB5EW');

    //expect
    await expect(changeLicenseTo('invalid', driver)).rejects.toThrow(
      NotAcceptableException,
    );
  });

  it('should activate driver with valid license', async () => {
    //given
    const driver = await createInactiveDriverWithLicense('FARME100165AB5EW');

    //when
    await activate(driver);

    //then
    const driverDto = await load(driver);
    expect(driverDto.status).toEqual(DriverStatus.ACTIVE);
  });

  it('should not activate driver with invalid license', async () => {
    //given
    expect.assertions(1);
    const driver = await createInactiveDriverWithLicense('invalid');

    //expect
    await expect(activate(driver)).rejects.toThrow(ForbiddenException);
  });

  async function createInactiveDriverWithLicense(
    driverLicense: string,
  ): Promise<Driver> {
    return driverService.createDriver({
      driverLicense,
      lastName: 'Kowalski',
      firstName: 'Jan',
      photo: 'c3RyaW5n',
    });
  }

  async function createActiveDriverWithLicense(
    driverLicense: string,
  ): Promise<Driver> {
    return driverService.createDriver(
      {
        driverLicense,
        lastName: 'Kowalski',
        firstName: 'Jan',
        photo: 'c3RyaW5n',
      },
      DriverStatus.ACTIVE,
    );
  }

  async function load(driver: Driver): Promise<DriverDto> {
    return driverService.loadDriver(driver.getId());
  }

  async function changeLicenseTo(
    newLicense: string,
    driver: Driver,
  ): Promise<void> {
    return driverService.changeLicenseNumber(newLicense, driver.getId());
  }

  async function activate(driver: Driver): Promise<void> {
    return driverService.changeDriverStatus(
      driver.getId(),
      DriverStatus.ACTIVE,
    );
  }
});
