import { Client, Type as ClientType } from 'src/entity/client.entity';
import { Transit } from 'src/entity/transit.entity';
import { AwardedMiles } from 'src/entity/awarded-miles.entity';
import { getTestApp, getTestService } from 'test/setup/test-server';
import { AppProperties } from 'src/config/app-properties.config';
import * as dayjs from 'dayjs';
import { AwardsService } from 'src/service/awards.service';
import * as fixtures from 'test/common/fixtures';
import { AwardedMilesRepository } from 'src/repository/awarded-miles.repository';

const DAY_BEFORE_YESTERDAY = dayjs('1989-12-12 12:12');
const YESTERDAY = DAY_BEFORE_YESTERDAY.add(1, 'day');
const TODAY = YESTERDAY.add(1, 'day');
const SUNDAY = dayjs('1989-12-17 12:12');

describe('Removing Award Miles', () => {
  let awardsService: AwardsService;

  beforeAll(async () => {
    const app = await getTestApp();
    awardsService = app.get(AwardsService);
    console.log = jest.fn();
  });

  it('should by default remove oldest first even when they are not expiring', async () => {
    //given
    const client = await clientWithAnActiveMilesProgram();
    //and
    const transit = await fixtures.aTransit(null, 80);
    //and
    const grantedMilesThatWillExpireInDays =
      getGrantedMilesThatWillExpireInDaysFn(client, transit);
    const middle = await grantedMilesThatWillExpireInDays(10, 365, YESTERDAY);
    const youngest = await grantedMilesThatWillExpireInDays(10, 365, TODAY);
    const oldestNonExpiringMiles = await grantedNonExpiringMiles(
      5,
      DAY_BEFORE_YESTERDAY,
      client,
    );

    //when
    await awardsService.removeMiles(client.getId(), 16);

    //then
    const expectMilesReducedTo = await getExpectMilesReducedToChecker(client);
    expectMilesReducedTo(oldestNonExpiringMiles, 0);
    expectMilesReducedTo(middle, 0);
    expectMilesReducedTo(youngest, 9);
  });

  it('should remove oldest miles first when many transits', async () => {
    //given
    const client = await clientWithAnActiveMilesProgram();
    //and
    await fixtures.clientHasDoneTransits(client, 15);
    //and
    const transit = await fixtures.aTransit(null, 80);
    //and
    const grantedMilesThatWillExpireInDays =
      getGrantedMilesThatWillExpireInDaysFn(client, transit);
    const oldest = await grantedMilesThatWillExpireInDays(
      10,
      60,
      DAY_BEFORE_YESTERDAY,
    );
    const middle = await grantedMilesThatWillExpireInDays(10, 365, YESTERDAY);
    const youngest = await grantedMilesThatWillExpireInDays(10, 30, TODAY);

    //when
    await awardsService.removeMiles(client.getId(), 15);

    //then
    const expectMilesReducedTo = await getExpectMilesReducedToChecker(client);
    expectMilesReducedTo(oldest, 0);
    expectMilesReducedTo(middle, 5);
    expectMilesReducedTo(youngest, 10);
  });

  it('should remove non expiring miles last when many transits', async () => {
    //given
    const client = await clientWithAnActiveMilesProgram();
    //and
    await fixtures.clientHasDoneTransits(client, 15);
    //and
    const transit = await fixtures.aTransit(null, 80);
    //and
    const grantedMilesThatWillExpireInDays =
      getGrantedMilesThatWillExpireInDaysFn(client, transit);
    const regularMiles = await grantedMilesThatWillExpireInDays(10, 365, TODAY);
    const oldestNonExpiringMiles = await grantedNonExpiringMiles(
      5,
      DAY_BEFORE_YESTERDAY,
      client,
    );

    //when
    await awardsService.removeMiles(client.getId(), 13);

    //then
    const expectMilesReducedTo = await getExpectMilesReducedToChecker(client);
    expectMilesReducedTo(regularMiles, 0);
    expectMilesReducedTo(oldestNonExpiringMiles, 2);
  });

  it('should remove soon to expire miles first when client is vip', async () => {
    //given
    const client = await clientWithAnActiveMilesProgram(ClientType.VIP);
    //and
    const transit = await fixtures.aTransit(null, 80);
    //and
    const grantedMilesThatWillExpireInDays =
      getGrantedMilesThatWillExpireInDaysFn(client, transit);
    const secondToExpire = await grantedMilesThatWillExpireInDays(
      10,
      60,
      YESTERDAY,
    );
    const thirdToExpire = await grantedMilesThatWillExpireInDays(
      5,
      365,
      DAY_BEFORE_YESTERDAY,
    );
    const firstToExpire = await grantedMilesThatWillExpireInDays(15, 30, TODAY);
    const nonExpiringMiles = await grantedNonExpiringMiles(
      1,
      DAY_BEFORE_YESTERDAY,
      client,
    );

    //when
    await awardsService.removeMiles(client.getId(), 21);

    //then
    const expectMilesReducedTo = await getExpectMilesReducedToChecker(client);
    expectMilesReducedTo(nonExpiringMiles, 1);
    expectMilesReducedTo(firstToExpire, 0);
    expectMilesReducedTo(secondToExpire, 4);
    expectMilesReducedTo(thirdToExpire, 5);
  });

  it('should remove soon to expire miles first when removing on sunday and client has done many transits', async () => {
    //given
    const client = await clientWithAnActiveMilesProgram();
    //and
    await fixtures.clientHasDoneTransits(client, 15);
    //and
    const transit = await fixtures.aTransit(null, 80);
    //and
    const grantedMilesThatWillExpireInDays =
      getGrantedMilesThatWillExpireInDaysFn(client, transit);
    const secondToExpire = await grantedMilesThatWillExpireInDays(
      10,
      60,
      YESTERDAY,
    );
    const thirdToExpire = await grantedMilesThatWillExpireInDays(
      5,
      365,
      DAY_BEFORE_YESTERDAY,
    );
    const firstToExpire = await grantedMilesThatWillExpireInDays(15, 10, TODAY);
    const nonExpiringMiles = await grantedNonExpiringMiles(
      100,
      YESTERDAY,
      client,
    );

    //when
    itIsSunday();
    await awardsService.removeMiles(client.getId(), 21);

    //then
    const expectMilesReducedTo = await getExpectMilesReducedToChecker(client);
    expectMilesReducedTo(nonExpiringMiles, 100);
    expectMilesReducedTo(firstToExpire, 0);
    expectMilesReducedTo(secondToExpire, 4);
    expectMilesReducedTo(thirdToExpire, 5);
  });

  it('should remove expiring miles first when client has many claims', async () => {
    //given
    const client = await clientWithAnActiveMilesProgram();
    //and
    await fixtures.clientHasDoneClaims(client, 3);
    //and
    const transit = await fixtures.aTransit(null, 80);
    //and
    const grantedMilesThatWillExpireInDays =
      getGrantedMilesThatWillExpireInDaysFn(client, transit);
    const secondToExpire = await grantedMilesThatWillExpireInDays(
      4,
      60,
      YESTERDAY,
    );
    const thirdToExpire = await grantedMilesThatWillExpireInDays(
      10,
      365,
      DAY_BEFORE_YESTERDAY,
    );
    const firstToExpire = await grantedMilesThatWillExpireInDays(
      5,
      10,
      YESTERDAY,
    );
    const nonExpiringMiles = await grantedNonExpiringMiles(
      10,
      YESTERDAY,
      client,
    );

    //when
    await awardsService.removeMiles(client.getId(), 21);

    //then
    const expectMilesReducedTo = await getExpectMilesReducedToChecker(client);
    expectMilesReducedTo(nonExpiringMiles, 0);
    expectMilesReducedTo(thirdToExpire, 0);
    expectMilesReducedTo(secondToExpire, 3);
    expectMilesReducedTo(firstToExpire, 5);
  });

  async function loadAwardedMiles(client: Client): Promise<AwardedMiles[]> {
    const awardedMilesRepository = await getTestService(AwardedMilesRepository);
    return awardedMilesRepository.findAllByClient(client);
  }

  function getGrantedMilesThatWillExpireInDaysFn(
    client: Client,
    transit: Transit,
  ) {
    return async (
      miles: number,
      expirationInDays: number,
      when: Date | dayjs.Dayjs,
    ) => {
      await milesWillExpireInDays(expirationInDays);
      await defaultMilesBonusIs(miles);
      const awarded = await milesRegisteredAt(when, client, transit);
      if (!awarded) {
        throw new Error('Awarded miles not assigned');
      }
      return awarded;
    };
  }

  async function grantedNonExpiringMiles(
    miles: number,
    when: Date | dayjs.Dayjs,
    client: Client,
  ): Promise<AwardedMiles> {
    Date.now = jest.fn(() => when.valueOf());
    await defaultMilesBonusIs(miles);
    return awardsService.registerNonExpiringMiles(client.getId(), miles);
  }

  async function getExpectMilesReducedToChecker(client: Client) {
    const allMiles = await loadAwardedMiles(client);
    return (firstToExpire: AwardedMiles, milesAfterReduction: number) => {
      const actual = allMiles
        .find((mile) => mile.getId() === firstToExpire.getId())
        ?.getMiles();
      expect(actual).toEqual(milesAfterReduction);
    };
  }

  async function milesRegisteredAt(
    when: Date | dayjs.Dayjs,
    client: Client,
    transit: Transit,
  ): Promise<AwardedMiles | null> {
    Date.now = jest.fn(() => when.valueOf());
    const awarded = awardsService.registerMiles(
      client.getId(),
      transit.getId(),
    );
    if (!awarded) {
      throw new Error('Awarded miles not assigned');
    }
    return awarded;
  }

  async function clientWithAnActiveMilesProgram(
    clientType = ClientType.NORMAL,
  ): Promise<Client> {
    Date.now = jest.fn(() => DAY_BEFORE_YESTERDAY.valueOf());
    const client = await fixtures.aClient(clientType);
    await fixtures.activeAwardsAccount(client);
    return client;
  }

  async function milesWillExpireInDays(days: number): Promise<void> {
    const appProperties = await getTestService(AppProperties);
    jest
      .spyOn(appProperties, 'getMilesExpirationInDays')
      .mockImplementation(() => days);
  }

  async function defaultMilesBonusIs(miles: number): Promise<void> {
    const appProperties = await getTestService(AppProperties);
    jest
      .spyOn(appProperties, 'getDefaultMilesBonus')
      .mockImplementation(() => miles);
  }

  function itIsSunday(): void {
    Date.now = jest.fn(() => SUNDAY.valueOf());
  }
});
