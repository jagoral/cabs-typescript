import { NotAcceptableException } from '@nestjs/common';

const MILES_TO_KILOMETERS_RATIO = 1.609344;

export class Distance {
  public static readonly ZERO = new Distance(0);

  private constructor(private readonly km: number) {}

  public static ofKm(km: number): Distance {
    return new Distance(km);
  }

  public toKmInNumber(): number {
    return this.km;
  }

  public printIn(unit: string): string {
    if (unit === 'km') {
      if (this.km == Math.ceil(this.km)) {
        return new Intl.NumberFormat('en-US', {
          style: 'unit',
          unit: 'kilometer',
        }).format(Math.round(this.km));
      }
      return new Intl.NumberFormat('en-US', {
        style: 'unit',
        unit: 'kilometer',
      }).format(this.km);
    }
    if (unit === 'miles') {
      const distance = this.km / MILES_TO_KILOMETERS_RATIO;
      if (distance == Math.ceil(distance)) {
        return new Intl.NumberFormat('en-US', {
          style: 'unit',
          unit: 'mile',
        }).format(Math.round(distance));
      }
      return new Intl.NumberFormat('en-US', {
        style: 'unit',
        unit: 'mile',
      }).format(distance);
    }
    if (unit === 'm') {
      return new Intl.NumberFormat('en-US', {
        style: 'unit',
        unit: 'meter',
      }).format(Math.round(this.km * 1000));
    }
    throw new NotAcceptableException('Invalid unit ' + unit);
  }

  public equals(other: Distance): boolean {
    return this.km === other.km;
  }
}
