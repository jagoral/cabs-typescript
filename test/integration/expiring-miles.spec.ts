import * as fixtures from 'test/common/fixtures';
import * as dayjs from 'dayjs';
import { createTestApp, getTestService } from 'test/setup/test-server';
import { AppProperties } from 'src/config/app-properties.config';
import { Transit } from 'src/entity/transit.entity';
import { Client } from 'src/entity/client.entity';
import { AwardsService } from 'src/service/awards.service';

describe('Expiring Miles', () => {
  beforeAll(async () => {
    await createTestApp();
  });

  it('should take into account expired miles when calculating balance', async () => {
    //given
    const client = await fixtures.aClient();
    //and
    defaultMilesBonusIs(10);
    //and
    defaultMilesExpirationInDaysIs(365);
    //and
    await fixtures.activeAwardsAccount(client);
    //and
    const transit = await fixtures.aTransit(null, 80);
    const expectBalanceAt = getExpectBalanceChecker(client);

    //when
    await registerMilesAt(transit, client, dayjs('1989-12-12').toDate());
    //then
    await expectBalanceAt(dayjs('1989-12-12'), 10);
    //when
    await registerMilesAt(transit, client, dayjs('1989-12-13').toDate());
    //then
    await expectBalanceAt(dayjs('1989-12-13'), 20);
    //when
    await registerMilesAt(transit, client, dayjs('1989-12-14').toDate());
    //then
    await expectBalanceAt(dayjs('1989-12-14'), 30);
    await expectBalanceAt(dayjs('1989-12-12').add(300, 'days'), 30);
    await expectBalanceAt(dayjs('1989-12-12').add(365, 'days'), 20);
    await expectBalanceAt(dayjs('1989-12-13').add(365, 'days'), 10);
    await expectBalanceAt(dayjs('1989-12-14').add(365, 'days'), 0);
  });

  function getExpectBalanceChecker(client: Client) {
    return async (date: dayjs.Dayjs, expected: number): Promise<void> => {
      expect(await calculateBalanceAt(client, date.toDate())).toEqual(expected);
    };
  }

  async function defaultMilesBonusIs(bonus: number): Promise<void> {
    const appProperties = await getTestService(AppProperties);
    jest
      .spyOn(appProperties, 'getDefaultMilesBonus')
      .mockImplementation(() => bonus);
  }

  async function defaultMilesExpirationInDaysIs(days: number): Promise<void> {
    const appProperties = await getTestService(AppProperties);
    jest
      .spyOn(appProperties, 'getMilesExpirationInDays')
      .mockImplementation(() => days);
  }

  async function registerMilesAt(
    transit: Transit,
    client: Client,
    when: Date,
  ): Promise<void> {
    Date.now = jest.fn(() => when.valueOf());
    const awardsService = await getTestService(AwardsService);
    await awardsService.registerMiles(client.getId(), transit.getId());
  }

  async function calculateBalanceAt(
    client: Client,
    when: Date,
  ): Promise<number> {
    Date.now = jest.fn(() => when.valueOf());
    const awardsService = await getTestService(AwardsService);
    return awardsService.calculateBalance(client.getId());
  }
});
