import { NotAcceptableException } from '@nestjs/common';
import { AddressDto } from 'src/dto/address.dto';
import { CreateTransitDto } from 'src/dto/create-transit.dto';
import { CarClass } from 'src/entity/car-type.entity';
import { FeeType } from 'src/entity/driver-fee.entity';
import { Status, Transit } from 'src/entity/transit.entity';
import { DriverSessionService } from 'src/service/driver-session.service';
import { DriverTrackingService } from 'src/service/driver-tracking.service';
import { GeocodingService } from 'src/service/geocoding.service';
import { TransitService } from 'src/service/transit.service';
import {
  aDriver,
  anActiveCarCategory,
  anAddress,
  aTransitDTO,
  driverHasFee,
} from 'test/common/fixtures';
import { createTestApp, getTestService } from 'test/setup/test-server';

describe('Transit Life Cycle', () => {
  let transitService: TransitService;

  beforeAll(async () => {
    jest.setTimeout(50000000);
    const app = await createTestApp();
    transitService = app.get(TransitService);
    const geocodingService = app.get(GeocodingService);
    await anActiveCarCategory(CarClass.VAN);
    jest
      .spyOn(geocodingService, 'geocodeAddress')
      .mockImplementation((address) =>
        address.getCountry() === 'Polska' ? [1, 1] : [1000, 1000],
      );
    console.log = jest.fn();
  });

  it('should create transit', async () => {
    //when
    const transit = await requestTransitFromTo(
      getSomeAddress({
        country: 'Polska',
        city: 'Warszawa',
        street: 'Marszałkowska',
        buildingNumber: 20,
        postalCode: '00-000',
      }),
      getSomeAddress({
        country: 'Polska',
        city: 'Warszawa',
        street: 'Piłsudskiego',
        buildingNumber: 15,
        postalCode: '02-000',
      }),
    );

    //then
    const loaded = await transitService.loadTransit(transit.getId());
    expect(loaded.getCarClass()).toBeNil();
    expect(loaded.getClaimDTO()).toBeNil();
    expect(loaded.getEstimatedPrice()).not.toBeNil();
    expect(loaded.getPrice()).toBeNil();
    expect(loaded.getFrom()).toMatchObject({
      country: 'Polska',
      city: 'Warszawa',
      street: 'Marszałkowska',
      buildingNumber: 20,
      postalCode: '00-000',
    });
    expect(loaded.getTo()).toMatchObject({
      country: 'Polska',
      city: 'Warszawa',
      street: 'Piłsudskiego',
      buildingNumber: 15,
      postalCode: '02-000',
    });
    expect(loaded.getStatus()).toEqual(Status.DRAFT);
    expect(loaded.getTariff()).not.toBeNil();
    expect(loaded.getKmRate()).toBeGreaterThan(0);
    expect(loaded.getDateTime()).not.toBeNil();
  });

  it('should change transit destination', async () => {
    //given
    const transit = await requestTransitFromTo(
      getSomeAddress(),
      getSomeAddress(),
    );

    //when
    await transitService.changeTransitAddressTo(
      transit.getId(),
      new AddressDto(
        getSomeAddress({ street: 'Mazowiecka', buildingNumber: 30 }),
      ),
    );

    //then
    const loaded = await transitService.loadTransit(transit.getId());
    expect(loaded.getTo()).toMatchObject({
      street: 'Mazowiecka',
      buildingNumber: 30,
    });
    expect(loaded.getEstimatedPrice()).not.toBeNil();
    expect(loaded.getPrice()).toBeNil();
  });

  it('should not change destination when transit is completed', async () => {
    //given
    const { driverId, transitId } = await publishTransit();
    //and
    await transitService.acceptTransit(driverId, transitId);
    //and
    await transitService.startTransit(driverId, transitId);
    //and
    await transitService.completeTransit(
      driverId,
      transitId,
      await anAddress(),
    );

    //expect
    await expect(() =>
      transitService.changeTransitAddressTo(
        transitId,
        new AddressDto(getSomeAddress()),
      ),
    ).rejects.toThrow(NotAcceptableException);
  });

  it('should change pickup place', async () => {
    //given
    const transit = await requestTransitFromTo(
      getSomeAddress(),
      getSomeAddress(),
    );

    //when
    await transitService.changeTransitAddressFrom(
      transit.getId(),
      new AddressDto(
        getSomeAddress({ street: 'Puławska', buildingNumber: 28 }),
      ),
    );

    //then
    const loaded = await transitService.loadTransit(transit.getId());
    expect(loaded.getFrom()).toMatchObject({
      buildingNumber: 28,
      street: 'Puławska',
    });
  });

  it('should not change pickup place after transit is accepted', async () => {
    //given
    const { driverId, transitId } = await publishTransit();
    //and
    await transitService.acceptTransit(driverId, transitId);
    //and
    await transitService.startTransit(driverId, transitId);
    //and
    await transitService.completeTransit(
      driverId,
      transitId,
      await anAddress(),
    );

    //expect
    await expect(() =>
      transitService.changeTransitAddressFrom(
        transitId,
        new AddressDto(getSomeAddress()),
      ),
    ).rejects.toThrow(NotAcceptableException);
  });

  it('should not change pickup place more than three times', async () => {
    //given
    const transit = await requestTransitFromTo(
      getSomeAddress(),
      getSomeAddress(),
    );
    //and
    await transitService.changeTransitAddressFrom(
      transit.getId(),
      new AddressDto(getSomeAddress({ buildingNumber: 28 })),
    );
    //and
    await transitService.changeTransitAddressFrom(
      transit.getId(),
      new AddressDto(getSomeAddress({ buildingNumber: 29 })),
    );
    //and
    await transitService.changeTransitAddressFrom(
      transit.getId(),
      new AddressDto(getSomeAddress({ buildingNumber: 30 })),
    );

    //expect
    await expect(() =>
      transitService.changeTransitAddressFrom(
        transit.getId(),
        new AddressDto(getSomeAddress({ buildingNumber: 31 })),
      ),
    ).rejects.toThrow(NotAcceptableException);
  });

  it('should not change pickup place when it is far away from original', async () => {
    //given
    const transit = await requestTransitFromTo(
      getSomeAddress(),
      getSomeAddress(),
    );

    //expect
    await expect(() =>
      transitService.changeTransitAddressFrom(
        transit.getId(),
        new AddressDto(farAwayAddress()),
      ),
    ).rejects.toThrow(NotAcceptableException);
  });

  it('should cancel transit', async () => {
    //given
    const transit = await requestTransitFromTo(
      getSomeAddress(),
      getSomeAddress(),
    );

    //when
    await transitService.cancelTransit(transit.getId());

    //then
    const loaded = await transitService.loadTransit(transit.getId());
    expect(loaded.getStatus()).toEqual(Status.CANCELLED);
  });

  it('should not cancel transit after it was started', async () => {
    //given
    const { driverId, transitId } = await publishTransit();
    //and
    await transitService.acceptTransit(driverId, transitId);
    //and
    await transitService.startTransit(driverId, transitId);

    //expect
    await expect(() => transitService.cancelTransit(transitId)).rejects.toThrow(
      NotAcceptableException,
    );

    //and
    await transitService.completeTransit(
      driverId,
      transitId,
      await anAddress(),
    );
    //expect
    await expect(() => transitService.cancelTransit(transitId)).rejects.toThrow(
      NotAcceptableException,
    );
  });

  it('should publish transit', async () => {
    //given
    const { loadTransit } = await publishTransit();

    //then
    const loaded = await loadTransit();
    expect(loaded.getStatus()).toEqual(Status.WAITING_FOR_DRIVER_ASSIGNMENT);
    expect(loaded.getPublished()).not.toBeNil();
  });

  it('can accept transit', async () => {
    //given
    const { driverId, transitId, loadTransit } = await publishTransit();

    //when
    await transitService.acceptTransit(driverId, transitId);

    //then
    const loaded = await loadTransit();
    expect(loaded.getStatus()).toEqual(Status.TRANSIT_TO_PASSENGER);
    expect(loaded.getAcceptedAt()).not.toBeNil();
  });

  it('should only one driver accept transit', async () => {
    //given
    const { driverId, transitId } = await publishTransit();
    const secondDriverId = await aNearbyDriver('DW MARIO');

    //when
    await transitService.acceptTransit(driverId, transitId);

    //expect
    await expect(() =>
      transitService.acceptTransit(secondDriverId, transitId),
    ).rejects.toThrow(NotAcceptableException);
  });

  it('should not accept by driver who already rejected', async () => {
    //given
    const { driverId, transitId } = await publishTransit();

    //when
    await transitService.rejectTransit(driverId, transitId);

    //expect
    await expect(() =>
      transitService.acceptTransit(driverId, transitId),
    ).rejects.toThrow(NotAcceptableException);
  });

  it('should not accept by driver who has not seen proposal', async () => {
    //given
    const farAwayDriverId = await aFarAwayDriver('WU1212');
    //and
    const { transitId } = await publishTransit();

    //expect
    await expect(() =>
      transitService.acceptTransit(farAwayDriverId, transitId),
    ).rejects.toThrow(NotAcceptableException);
  });

  it('should start transit', async () => {
    //given
    const { driverId, transitId, loadTransit } = await publishTransit();
    //and
    await transitService.acceptTransit(driverId, transitId);

    //when
    await transitService.startTransit(driverId, transitId);

    //then
    const loaded = await loadTransit();
    expect(loaded.getStatus()).toEqual(Status.IN_TRANSIT);
    expect(loaded.getStarted()).not.toBeNil();
  });

  it('should not start not accepted transit', async () => {
    //given
    const { driverId, transitId } = await publishTransit();

    //expect
    await expect(() =>
      transitService.startTransit(driverId, transitId),
    ).rejects.toThrow(NotAcceptableException);
  });

  it('should complete transit', async () => {
    //given
    const { driverId, transitId, loadTransit } = await publishTransit();
    //and
    await transitService.acceptTransit(driverId, transitId);
    //and
    await transitService.startTransit(driverId, transitId);

    //when
    await transitService.completeTransit(
      driverId,
      transitId,
      await anAddress(),
    );

    //then
    const loaded = await loadTransit();
    expect(loaded.getStatus()).toEqual(Status.COMPLETED);
    expect(loaded.getTariff()).not.toBeNil();
    expect(loaded.getPrice()).not.toBeNil();
    expect(loaded.getDriverFee()).not.toBeNil();
    expect(loaded.getCompleteAt()).not.toBeNil();
  });

  it('should not complete not started transit', async () => {
    //given
    const { driverId, transitId } = await publishTransit();
    //and
    await transitService.acceptTransit(driverId, transitId);

    //expect
    await expect(async () =>
      transitService.completeTransit(driverId, transitId, await anAddress()),
    ).rejects.toThrow(NotAcceptableException);
  });

  it('should reject transit', async () => {
    //given
    const { driverId, transitId, loadTransit } = await publishTransit();

    //when
    await transitService.rejectTransit(driverId, transitId);

    //then
    const loaded = await loadTransit();
    expect(loaded.getStatus()).toEqual(Status.WAITING_FOR_DRIVER_ASSIGNMENT);
    expect(loaded.getAcceptedAt()).toBeNil();
  });

  function farAwayAddress() {
    return getSomeAddress({ country: 'Dania' });
  }

  async function publishTransit() {
    const destination = getSomeAddress({ street: 'Żytnia' });
    const transit = await requestTransitFromTo(getSomeAddress(), destination);
    //and
    const driverId = await aNearbyDriver('WU1212');
    //and
    await transitService.publishTransit(transit.getId());

    return {
      transitId: transit.getId(),
      driverId,
      loadTransit: () => transitService.loadTransit(transit.getId()),
    };
  }

  async function aLoggedInDriver(
    plateNumber: string,
    position: [number, number],
  ) {
    const driverSessionService = await getTestService(DriverSessionService);
    const driverTrackingService = await getTestService(DriverTrackingService);
    const driver = await aDriver();
    await driverHasFee(driver, { feeType: FeeType.FLAT, amount: 10 });
    await driverSessionService.logIn(
      driver.getId(),
      plateNumber,
      CarClass.VAN,
      'BRAND',
    );
    await driverTrackingService.registerPosition(
      driver.getId(),
      position[0],
      position[1],
    );
    return driver.getId();
  }

  const aNearbyDriver = (plateNumber: string) =>
    aLoggedInDriver(plateNumber, [1, 1]);

  const aFarAwayDriver = (plateNumber: string) =>
    aLoggedInDriver(plateNumber, [1000, 1000]);

  async function requestTransitFromTo(
    pickup: CreateTransitDto['from'],
    destination: CreateTransitDto['to'],
  ): Promise<Transit> {
    return transitService.createTransit(await aTransitDTO(pickup, destination));
  }

  function getSomeAddress(
    overrides: Partial<CreateTransitDto['from']> = {},
  ): CreateTransitDto['from'] {
    return {
      country: 'Polska',
      city: 'Warszawa',
      street: 'Młynarska',
      buildingNumber: 1,
      additionalNumber: 1,
      postalCode: '00-000',
      ...overrides,
    };
  }
});
