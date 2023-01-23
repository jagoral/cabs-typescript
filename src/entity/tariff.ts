import { DayOfWeek } from './transit.entity';
import * as dayjs from 'dayjs';
import * as dayOfYear from 'dayjs/plugin/dayOfYear';
import { Distance } from 'src/distance/distance';
import { Money } from 'src/money/money';

dayjs.extend(dayOfYear);

const BASE_FEE = 8;

export class Tariff {
  private constructor(
    private readonly kmRate: number,
    private readonly name: string,
    private readonly baseFee: number,
  ) {}

  public static ofTime(time: Date | number): Tariff {
    const day = dayjs(time);

    const year = day.get('year');
    const leap = (year % 4 == 0 && year % 100 != 0) || year % 400 == 0;

    if (
      (leap && day.dayOfYear() == 366) ||
      (!leap && day.dayOfYear() == 365) ||
      (day.dayOfYear() == 1 && day.get('hour') <= 6)
    ) {
      return new Tariff(3.5, 'Sylwester', BASE_FEE + 3);
    } else {
      switch (day.get('day')) {
        case DayOfWeek.MONDAY:
        case DayOfWeek.TUESDAY:
        case DayOfWeek.WEDNESDAY:
        case DayOfWeek.THURSDAY:
          return new Tariff(1.0, 'Standard', BASE_FEE + 1);
        case DayOfWeek.FRIDAY:
          if (day.get('hour') < 17) {
            return new Tariff(1.0, 'Standard', BASE_FEE + 1);
          } else {
            return new Tariff(2.5, 'Weekend+', BASE_FEE + 2);
          }
          break;
        case DayOfWeek.SATURDAY:
          if (day.get('hour') < 6 || day.get('hour') >= 17) {
            return new Tariff(2.5, 'Weekend+', BASE_FEE + 2);
          } else if (day.get('hour') < 17) {
            return new Tariff(1.5, 'Weekend', BASE_FEE);
          }
          break;
        case DayOfWeek.SUNDAY:
          if (day.get('hour') < 6) {
            return new Tariff(2.5, 'Weekend+', BASE_FEE + 2);
          } else {
            return new Tariff(1.5, 'Weekend', BASE_FEE);
          }
      }
    }
    throw new Error('Tariff not found');
  }

  public calculateCost(distance: Distance): Money {
    const priceBigDecimal = Number(
      (distance.toKmInNumber() * this.kmRate + this.baseFee).toFixed(2),
    );
    return new Money(priceBigDecimal);
  }

  public getName() {
    return this.name;
  }

  public getKmRate() {
    return this.kmRate;
  }

  public getBaseFee() {
    return this.baseFee;
  }
}
