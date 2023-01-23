import { Tariff } from './tariff';
import * as dayjs from 'dayjs';
import { Distance } from 'src/distance/distance';

describe('Tariff', () => {
  it('should calculate and display regular tariff', () => {
    //given
    const tariff = Tariff.ofTime(dayjs('2021-04-16 08:30').valueOf());

    //expect
    expect(tariff.calculateCost(Distance.ofKm(20)).toInt()).toEqual(29);
    expect(tariff.getName()).toEqual('Standard');
    expect(tariff.getKmRate()).toEqual(1.0);
  });

  it('should calculate and display sunday tariff', () => {
    //given
    const tariff = Tariff.ofTime(dayjs('2021-04-18 08:30').valueOf());

    //expect
    expect(tariff.calculateCost(Distance.ofKm(20)).toInt()).toEqual(38);
    expect(tariff.getName()).toEqual('Weekend');
    expect(tariff.getKmRate()).toEqual(1.5);
  });

  it('should calculate and display new years eve tariff', () => {
    //given
    const tariff = Tariff.ofTime(dayjs('2021-12-31 08:30').valueOf());

    //expect
    expect(tariff.calculateCost(Distance.ofKm(20)).toInt()).toEqual(81);
    expect(tariff.getName()).toEqual('Sylwester');
    expect(tariff.getKmRate()).toEqual(3.5);
  });

  it('should calculate and display saturday tariff', () => {
    //given
    const tariff = Tariff.ofTime(dayjs('2021-04-17 08:30').valueOf());

    //expect
    expect(tariff.calculateCost(Distance.ofKm(20)).toInt()).toEqual(38);
    expect(tariff.getName()).toEqual('Weekend');
    expect(tariff.getKmRate()).toEqual(1.5);
  });

  it('should calculate and display saturday night tariff', () => {
    //given
    const tariff = Tariff.ofTime(dayjs('2021-04-17 19:30').valueOf());

    //expect
    expect(tariff.calculateCost(Distance.ofKm(20)).toInt()).toEqual(60);
    expect(tariff.getName()).toEqual('Weekend+');
    expect(tariff.getKmRate()).toEqual(2.5);
  });
});
