import { ForbiddenException } from '@nestjs/common';
import { Status, Transit } from './transit.entity';

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

  function createTransit(status: Status, km: number): Transit {
    const transit = new Transit();
    transit.setDateTime(new Date().getMilliseconds());
    // setKm has a side effect, so to avoid an error, status is set to DRAFT
    transit.setStatus(Status.DRAFT);
    transit.setKm(km);
    transit.setStatus(status);
    return transit;
  }

  function transitWasDoneOnFriday(transit: Transit): void {
    transit.setDateTime(new Date(2021, 4, 16, 8, 30).getMilliseconds());
  }
});
