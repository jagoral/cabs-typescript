import { NotAcceptableException } from '@nestjs/common';
import { Distance } from 'src/distance/distance';
import { Address } from 'src/entity/address.entity';
import { CarClass } from 'src/entity/car-type.entity';
import { Client } from 'src/entity/client.entity';
import { Transit } from 'src/entity/transit.entity';
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
    const transit = new Transit({
      from: new Address('PL', 'Warszawa', 'ul. Testowa 1', 1),
      to: new Address('PL', 'Warszawa', 'ul. Testowa 1', 1),
      distance: Distance.ofKm(km),
      client: new Client(),
      when: new Date(),
      carClass: CarClass.VAN,
    });
    transit.setPrice(new Money(10));
    return new TransitDto(transit);
  }
});
