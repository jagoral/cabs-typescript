import { ForbiddenException } from '@nestjs/common';
import { Distance } from 'src/distance/distance';
import { Status, Transit } from './transit.entity';
import * as dayjs from 'dayjs';
import { Address } from './address.entity';
import { CarClass } from './car-type.entity';
import { Client } from './client.entity';

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

  const transitWasDoneOnSaturday = transitWasDoneOn(dayjs('2021-04-17 08:30'));

  const transitWasDoneOnSunday = transitWasDoneOn(dayjs('2021-04-18 08:30'));

  const transitWasDoneOnSaturdayNight = transitWasDoneOn(
    dayjs('2021-04-17 19:30'),
  );

  const transitWasDoneIn2018 = transitWasDoneOn(dayjs('2018-01-01 08:30'));
});
