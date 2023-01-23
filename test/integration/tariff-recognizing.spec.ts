import { TransitController } from 'src/controllers/transit.controller';
import { aCompletedTransit } from 'test/common/fixtures';
import { createTestApp } from 'test/setup/test-server';
import * as dayjs from 'dayjs';

describe('Tariff Recognizing', () => {
  let transitController: TransitController;

  beforeAll(async () => {
    const app = await createTestApp();
    transitController = app.get(TransitController);
  });

  it('should display new years eve tariff', async () => {
    //given
    const transit = await aCompletedTransit(
      60,
      dayjs('2021-12-31 08:30').toDate(),
    );

    //when
    const transitDto = await transitController.getTransit(transit.getId());

    //then
    expect(transitDto.getTariff()).toEqual('Sylwester');
    expect(transitDto.getKmRate()).toEqual(3.5);
  });

  it('should display weekend tariff', async () => {
    //given
    const transit = await aCompletedTransit(
      60,
      dayjs('2021-04-17 08:30').toDate(),
    );

    //when
    const transitDto = await transitController.getTransit(transit.getId());

    //then
    expect(transitDto.getTariff()).toEqual('Weekend');
    expect(transitDto.getKmRate()).toEqual(1.5);
  });

  it('should display weekend plus tariff', async () => {
    //given
    const transit = await aCompletedTransit(
      60,
      dayjs('2021-04-17 22:30').toDate(),
    );

    //when
    const transitDto = await transitController.getTransit(transit.getId());

    //then
    expect(transitDto.getTariff()).toEqual('Weekend+');
    expect(transitDto.getKmRate()).toEqual(2.5);
  });

  it('should display standard tariff', async () => {
    //given
    const transit = await aCompletedTransit(
      60,
      dayjs('2021-04-13 22:30').toDate(),
    );

    //when
    const transitDto = await transitController.getTransit(transit.getId());

    //then
    expect(transitDto.getTariff()).toEqual('Standard');
    expect(transitDto.getKmRate()).toEqual(1);
  });

  it('should display standard tariff before 2019', async () => {
    //given
    const transit = await aCompletedTransit(
      60,
      dayjs('2018-12-31 08:30').toDate(),
    );

    //when
    const transitDto = await transitController.getTransit(transit.getId());

    //then
    expect(transitDto.getTariff()).toEqual('Standard');
    expect(transitDto.getKmRate()).toEqual(1);
  });
});
