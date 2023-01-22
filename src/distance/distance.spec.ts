import { NotAcceptableException } from '@nestjs/common';
import { Distance } from './distance';

describe('Distance', () => {
  it('should not understand invalid unit', () => {
    expect(() => Distance.ofKm(1).printIn('invalid')).toThrow(
      NotAcceptableException,
    );
  });

  it('should convert to number', () => {
    expect(Distance.ofKm(2000).toKmInNumber()).toEqual(2000);
    expect(Distance.ofKm(0).toKmInNumber()).toEqual(0);
    expect(Distance.ofKm(312.22).toKmInNumber()).toEqual(312.22);
    expect(Distance.ofKm(2).toKmInNumber()).toEqual(2);
  });

  it.each([
    // meters
    { km: 2000, unit: 'm', expected: '2,000,000 m' },
    { km: 0, unit: 'm', expected: '0 m' },
    { km: 312.22, unit: 'm', expected: '312,220 m' },
    // kilometers
    { km: 2000, unit: 'km', expected: '2,000 km' },
    { km: 0, unit: 'km', expected: '0 km' },
    { km: 312.22, unit: 'km', expected: '312.22 km' },
    { km: 312.221111232313, unit: 'km', expected: '312.221 km' },
    { km: 2, unit: 'km', expected: '2 km' },
    // miles
    { km: 2000, unit: 'miles', expected: '1,242.742 mi' },
    { km: 0, unit: 'miles', expected: '0 mi' },
    { km: 312.22, unit: 'miles', expected: '194.005 mi' },
    { km: 312.221111232313, unit: 'miles', expected: '194.005 mi' },
    { km: 2, unit: 'miles', expected: '1.243 mi' },
  ])(`should represent $km km as '$expected'`, ({ km, unit, expected }) =>
    expect(Distance.ofKm(km).printIn(unit)).toEqual(expected),
  );
});
