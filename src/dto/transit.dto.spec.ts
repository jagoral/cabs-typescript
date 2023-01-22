import { NotAcceptableException } from '@nestjs/common';
import { Distance } from 'src/distance/distance';
import { Address } from 'src/entity/address.entity';
import { Client } from 'src/entity/client.entity';
import { Status, Transit } from 'src/entity/transit.entity';
import { Money } from 'src/money/money';
import { TransitDto } from './transit.dto';

describe('Calculate Transit Distance', () => {
  it('should not work with invalid unit', () => {
    expect(() => transitForDistance(1).getDistance('invalid')).toThrow(
      NotAcceptableException,
    );
  });

  it.each([
    // kilometers
    { distance: 10, unit: 'km', expected: '10 km' },
    { distance: 10.123, unit: 'km', expected: '10.123 km' },
    { distance: 10.12345, unit: 'km', expected: '10.123 km' },
    { distance: 0, unit: 'km', expected: '0 km' },
    // meters
    { distance: 10, unit: 'm', expected: '10,000 m' },
    { distance: 10.123, unit: 'm', expected: '10,123 m' },
    { distance: 10.12345, unit: 'm', expected: '10,123 m' },
    { distance: 0, unit: 'm', expected: '0 m' },
    // miles
    { distance: 10, unit: 'miles', expected: '6.214 mi' },
    { distance: 10.123, unit: 'miles', expected: '6.29 mi' },
    { distance: 10.12345, unit: 'miles', expected: '6.29 mi' },
    { distance: 0, unit: 'miles', expected: '0 mi' },
  ])(
    'should represent distance $distance as $expected when unit is $unit',
    ({ distance, unit, expected }) =>
      expect(transitForDistance(distance).getDistance(unit)).toEqual(expected),
  );

  function transitForDistance(km: number): TransitDto {
    const transit = new Transit();
    transit.setPrice(new Money(10));
    transit.setDateTime(new Date().getTime());
    transit.setTo(new Address('PL', 'Warszawa', 'ul. Testowa 1', 1));
    transit.setFrom(new Address('PL', 'Warszawa', 'ul. Testowa 1', 1));
    transit.setStatus(Status.DRAFT);
    transit.setKm(Distance.ofKm(km));
    transit.setClient(new Client());
    return new TransitDto(transit);
  }
});
