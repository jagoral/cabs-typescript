import { ForbiddenException, NotAcceptableException } from '@nestjs/common';
import { Distance } from 'src/distance/distance';
import { Status, Transit } from './transit.entity';
import * as dayjs from 'dayjs';
import { Address } from './address.entity';
import { CarClass } from './car-type.entity';
import { Client } from './client.entity';
import { CreateTransitDto } from 'src/dto/create-transit.dto';
import { Driver } from './driver.entity';

describe('TransitEntity', () => {
  describe('Calculate Transit Price', () => {
    it('should not calculate price when transit is cancelled', () => {
      //given
      const transit = createTransit(Status.CANCELLED, 20);

      //expect
      expect(() => transit.calculateFinalCosts()).toThrow(ForbiddenException);
    });

    it('should not estimate price when transit is completed', () => {
      //given
      const transit = createTransit(Status.COMPLETED, 20);

      //expect
      expect(() => transit.estimateCost()).toThrow(ForbiddenException);
    });

    it('should calculate price on regular day', () => {
      //given
      const transit = createTransit(Status.COMPLETED, 20);
      transitWasDoneOnFriday(transit);

      //when
      const price = transit.calculateFinalCosts();

      //then
      expect(price.toInt()).toBe(29);
    });

    it('should estimate price on regular day', () => {
      //given
      const transit = createTransit(Status.DRAFT, 20);
      transitWasDoneOnFriday(transit);

      //when
      const price = transit.estimateCost();

      //then
      expect(price.toInt()).toBe(29);
    });

    it('should calculate price on sunday', () => {
      //given
      const transit = createTransit(Status.COMPLETED, 20);
      transitWasDoneOnSunday(transit);

      //when
      const price = transit.calculateFinalCosts();

      //then
      expect(price.toInt()).toBe(38);
    });

    it('should calculate price on new years eve', () => {
      //given
      const transit = createTransit(Status.COMPLETED, 20);
      transitWasDoneOnNewYearsEve(transit);

      //when
      const price = transit.calculateFinalCosts();

      //then
      expect(price.toInt()).toBe(81);
    });

    it('should calculate price on saturday', () => {
      //given
      const transit = createTransit(Status.COMPLETED, 20);
      transitWasDoneOnSaturday(transit);

      //when
      const price = transit.calculateFinalCosts();

      //then
      expect(price.toInt()).toBe(38);
    });

    it('should calculate price on saturday night', () => {
      //given
      const transit = createTransit(Status.COMPLETED, 20);
      transitWasDoneOnSaturdayNight(transit);

      //when
      const price = transit.calculateFinalCosts();

      //then
      expect(price.toInt()).toBe(60);
    });

    it('should use standard price before 2019', () => {
      //given
      const transit = createTransit(Status.COMPLETED, 20);
      transitWasDoneIn2018(transit);

      //when
      const price = transit.calculateFinalCosts();

      //then
      expect(price.toInt()).toBe(29);
    });

    function createTransit(status: Status, km: number): Transit {
      const transit = new Transit({
        when: new Date(),
        distance: Distance.ofKm(km),
        status,
        from: new Address('PL', 'Warszawa', 'Testowa', 1),
        to: new Address('PL', 'Warszawa', 'Testowa', 1),
        client: new Client(),
        carClass: CarClass.VAN,
      });
      return transit;
    }

    function transitWasDoneOn(day: dayjs.Dayjs) {
      return (transit: Transit) => {
        transit.setDateTime(day.valueOf());
      };
    }

    const transitWasDoneOnFriday = transitWasDoneOn(dayjs('2021-04-16 08:30'));

    const transitWasDoneOnNewYearsEve = transitWasDoneOn(
      dayjs('2021-12-31 08:30'),
    );

    const transitWasDoneOnSaturday = transitWasDoneOn(
      dayjs('2021-04-17 08:30'),
    );

    const transitWasDoneOnSunday = transitWasDoneOn(dayjs('2021-04-18 08:30'));

    const transitWasDoneOnSaturdayNight = transitWasDoneOn(
      dayjs('2021-04-17 19:30'),
    );

    const transitWasDoneIn2018 = transitWasDoneOn(dayjs('2018-01-01 08:30'));
  });

  describe('Transit Life Cycle', () => {
    it('should create transit', () => {
      //when
      const transit = requestTransitFromTo(
        getSomeAddress({
          country: 'Polska',
          city: 'Warszawa',
          street: 'Marszałkowska',
          buildingNumber: 20,
        }),
        getSomeAddress({
          country: 'Polska',
          city: 'Warszawa',
          street: 'Piłsudskiego',
          buildingNumber: 15,
        }),
      );

      //then
      expect(transit.getCarType()).toBeNil();
      expect(transit.getEstimatedPrice()).not.toBeNil();
      expect(transit.getPrice()).toBeNil();
      expect(transit.getFrom()).toMatchObject({
        country: 'Polska',
        city: 'Warszawa',
        street: 'Marszałkowska',
        buildingNumber: 20,
      });
      expect(transit.getTo()).toMatchObject({
        country: 'Polska',
        city: 'Warszawa',
        street: 'Piłsudskiego',
        buildingNumber: 15,
      });
      expect(transit.getStatus()).toEqual(Status.DRAFT);
      expect(transit.getTariff()).not.toBeNil();
      expect(transit.getTariff().getKmRate()).toBeGreaterThan(0);
      expect(transit.getDateTime()).not.toBeNil();
    });

    it('should change transit destination', () => {
      //given
      const transit = requestTransitFromTo(getSomeAddress(), getSomeAddress());

      //when
      transit.changeDestinationTo(
        getSomeAddress({ street: 'Mazowiecka', buildingNumber: 30 }),
        Distance.ofKm(20),
      );

      //then
      expect(transit.getTo()).toMatchObject({
        street: 'Mazowiecka',
        buildingNumber: 30,
      });
      expect(transit.getEstimatedPrice()).not.toBeNil();
      expect(transit.getPrice()).toBeNil();
    });

    it('should not change destination when transit is completed', () => {
      //given
      const { transit, accept, proposeTo, start, complete } = publishTransit();
      //and
      proposeTo();
      //and
      accept();
      //and
      start();
      //and
      complete();

      //expect
      expect(() =>
        transit.changeDestinationTo(getSomeAddress(), Distance.ofKm(20)),
      ).toThrow(NotAcceptableException);
    });

    it('should change pickup place', () => {
      //given
      const transit = requestTransitFromTo(getSomeAddress(), getSomeAddress());

      //when
      transit.changePickupTo(
        getSomeAddress({ street: 'Puławska', buildingNumber: 28 }),
        Distance.ofKm(20),
        0.2,
      );

      //then
      expect(transit.getFrom()).toMatchObject({
        buildingNumber: 28,
        street: 'Puławska',
      });
    });

    it('should not change pickup place after transit is accepted', () => {
      //given
      const { transit, accept, proposeTo, start, complete } = publishTransit();
      //and
      proposeTo();
      //and
      accept();
      //and
      start();
      //and
      complete();

      //expect
      expect(() =>
        transit.changePickupTo(getSomeAddress(), Distance.ofKm(20), 0.2),
      ).toThrow(NotAcceptableException);
    });

    it('should not change pickup place more than three times', () => {
      //given
      const transit = requestTransitFromTo(getSomeAddress(), getSomeAddress());
      //and
      transit.changePickupTo(
        getSomeAddress({ buildingNumber: 28 }),
        Distance.ofKm(20),
        0.1,
      );
      //and
      transit.changePickupTo(
        getSomeAddress({ buildingNumber: 29 }),
        Distance.ofKm(20.2),
        0.2,
      );
      //and
      transit.changePickupTo(
        getSomeAddress({ buildingNumber: 30 }),
        Distance.ofKm(21),
        0.22,
      );

      //expect
      expect(() =>
        transit.changePickupTo(
          getSomeAddress({ buildingNumber: 31 }),
          Distance.ofKm(20),
          0.23,
        ),
      ).toThrow(NotAcceptableException);
    });

    it('should not change pickup place when it is far away from original', () => {
      //given
      const transit = requestTransitFromTo(getSomeAddress(), getSomeAddress());

      //expect
      expect(() =>
        transit.changePickupTo(getSomeAddress(), Distance.ofKm(20), 25),
      ).toThrow(NotAcceptableException);
    });

    it('should cancel transit', () => {
      //given
      const transit = requestTransitFromTo(getSomeAddress(), getSomeAddress());

      //when
      transit.cancel();

      //then
      expect(transit.getStatus()).toEqual(Status.CANCELLED);
    });

    it('should not cancel transit after it was started', () => {
      //given
      const { transit, accept, start, proposeTo, complete } = publishTransit();
      //and
      proposeTo();
      //and
      accept();
      //and
      start();

      //expect
      expect(() => transit.cancel()).toThrow(NotAcceptableException);

      //and
      complete();
      //expect
      expect(() => transit.cancel()).toThrow(NotAcceptableException);
    });

    it('should publish transit', () => {
      //given
      const { transit } = publishTransit();

      //then
      expect(transit.getStatus()).toEqual(Status.WAITING_FOR_DRIVER_ASSIGNMENT);
      expect(transit.getPublished()).not.toBeNil();
    });

    it('can accept transit', () => {
      //given
      const { transit, accept, proposeTo } = publishTransit();
      //and
      proposeTo();

      //when
      accept();

      //then
      expect(transit.getStatus()).toEqual(Status.TRANSIT_TO_PASSENGER);
      expect(transit.getAcceptedAt()).not.toBeNil();
    });

    it('should only one driver accept transit', () => {
      //given
      const { accept, proposeTo } = publishTransit();
      const secondDriver = new Driver();
      //and
      proposeTo();

      //when
      accept();

      //expect
      expect(() => accept(secondDriver)).toThrow(NotAcceptableException);
    });

    it('should not accept by driver who already rejected', () => {
      //given
      const { accept, proposeTo, reject } = publishTransit();
      //and
      proposeTo();

      //when
      reject();

      //expect
      expect(() => accept()).toThrow(NotAcceptableException);
    });

    it('should not accept by driver who has not seen proposal', () => {
      //given
      const { accept } = publishTransit();

      //expect
      expect(() => accept()).toThrow(NotAcceptableException);
    });

    it('should start transit', () => {
      //given
      const { transit, start, proposeTo, accept } = publishTransit();
      //and
      proposeTo();
      //and
      accept();

      //when
      start();

      //then
      expect(transit.getStatus()).toEqual(Status.IN_TRANSIT);
      expect(transit.getStarted()).not.toBeNil();
    });

    it('should not start not accepted transit', () => {
      //given
      const { start, proposeTo } = publishTransit();
      //and
      proposeTo();

      //expect
      expect(() => start()).toThrow(NotAcceptableException);
    });

    it('should complete transit', () => {
      //given
      const { transit, start, complete, proposeTo, accept } = publishTransit();
      //and
      proposeTo();
      //and
      accept();
      //and
      start();

      //when
      complete();

      //then
      expect(transit.getStatus()).toEqual(Status.COMPLETED);
      expect(transit.getTariff()).not.toBeNil();
      expect(transit.getPrice()).not.toBeNil();
      expect(transit.getCompleteAt()).not.toBeNil();
    });

    it('should not complete not started transit', () => {
      //given
      const { proposeTo, complete, accept } = publishTransit();
      //and
      proposeTo();
      //and
      accept();

      //expect
      expect(() => complete()).toThrow(NotAcceptableException);
    });

    it('should reject transit', () => {
      //given
      const { transit, proposeTo, reject } = publishTransit();
      //and
      proposeTo();

      //when
      reject();

      //then
      expect(transit.getStatus()).toEqual(Status.WAITING_FOR_DRIVER_ASSIGNMENT);
      expect(transit.getAcceptedAt()).toBeNil();
    });

    function publishTransit() {
      const destination = getSomeAddress({ street: 'Żytnia' });
      const transit = requestTransitFromTo(getSomeAddress(), destination);
      //and
      transit.publishAt(new Date());
      //and
      const driver = new Driver();

      const proposeTo = () => transit.proposeTo(driver);
      const accept = (givenDriver?: Driver) =>
        transit.acceptBy(givenDriver || driver, new Date());
      const start = () => transit.start(new Date());
      const reject = () => transit.reject(driver);
      const complete = (address?: Address) =>
        transit.completeTransitAt(
          new Date(),
          address || destination,
          Distance.ofKm(20),
        );

      return {
        transit,
        proposeTo,
        accept,
        start,
        reject,
        complete,
      };
    }

    function requestTransitFromTo(
      pickup: Address,
      destination: Address,
    ): Transit {
      return new Transit({
        from: pickup,
        to: destination,
        when: new Date(),
        distance: Distance.ofKm(100),
        carClass: CarClass.VAN,
        client: new Client(),
      });
    }

    function getSomeAddress(
      overrides: Partial<CreateTransitDto['from']> = {},
    ): Address {
      return new Address(
        overrides.country || 'Polska',
        overrides.city || 'Warszawa',
        overrides.street || 'Młynarska',
        overrides.buildingNumber || 1,
      );
    }
  });
});
