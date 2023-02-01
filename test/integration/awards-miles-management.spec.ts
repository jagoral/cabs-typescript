import { NotAcceptableException } from '@nestjs/common';
import { AwardsAccountDto } from 'src/dto/awards-account.dto';
import { AwardedMiles } from 'src/entity/awarded-miles.entity';
import { Client } from 'src/entity/client.entity';
import { AwardedMilesRepository } from 'src/repository/awarded-miles.repository';
import { AwardsService } from 'src/service/awards.service';
import * as fixtures from 'test/common/fixtures';
import { createTestApp } from 'test/setup/test-server';

describe('Awards Miles Management', () => {
  let awardsService: AwardsService;
  let awardedMilesRepository: AwardedMilesRepository;

  beforeAll(async () => {
    const app = await createTestApp();
    awardsService = app.get(AwardsService);
    awardedMilesRepository = app.get(AwardedMilesRepository);
  });

  it('should register account', async () => {
    //given
    const client = await fixtures.aClient();

    //when
    await awardsService.registerToProgram(client.getId());

    //then
    const account = await load(client.getId());
    expect(account).not.toBeNil();
    expect(account.getClient().getId()).toEqual(client.getId());
    expect(account.getActive()).toBeFalse();
    expect(account.getTransactions()).toEqual(0);
  });

  it('should activate account', async () => {
    //given
    const client = await fixtures.aClient();
    //and
    await awardsService.registerToProgram(client.getId());

    //when
    await awardsService.activateAccount(client.getId());

    //then
    const account = await load(client.getId());
    expect(account.getActive()).toBeTrue();
  });

  it('should deactivate account', async () => {
    //given
    const client = await fixtures.aClient();
    //and
    await awardsService.registerToProgram(client.getId());
    //and
    await awardsService.activateAccount(client.getId());

    //when
    await awardsService.deactivateAccount(client.getId());

    //then
    const account = await load(client.getId());
    expect(account.getActive()).toBeFalse();
  });

  it('should register miles', async () => {
    //given
    const client = await fixtures.aClient();
    //and
    await fixtures.activeAwardsAccount(client);
    //and
    const transit = await fixtures.aTransit(null, 80);

    //when
    await awardsService.registerMiles(client.getId(), transit.getId());

    //then
    const account = await load(client.getId());
    expect(account.getTransactions()).toEqual(1);
    const awardedMiles = await loadAwardedMiles(client);
    expect(awardedMiles).toHaveLength(1);
    expect(awardedMiles[0].getMiles()).toEqual(10);
    expect(awardedMiles[0].getSpecial()).toBeFalse();
  });

  it('should register special miles', async () => {
    //given
    const client = await fixtures.aClient();
    //and
    await fixtures.activeAwardsAccount(client);

    //when
    await awardsService.registerSpecialMiles(client.getId(), 20);

    //then
    const account = await load(client.getId());
    expect(account.getTransactions()).toEqual(1);
    const awardedMiles = await loadAwardedMiles(client);
    expect(awardedMiles).toHaveLength(1);
    expect(awardedMiles[0].getMiles()).toEqual(20);
    expect(awardedMiles[0].getSpecial()).toBeTrue();
  });

  it('should calculate miles balance', async () => {
    //given
    const client = await fixtures.aClient();
    //and
    await fixtures.activeAwardsAccount(client);
    //and
    const transit = await fixtures.aTransit(null, 80);

    //when
    await awardsService.registerSpecialMiles(client.getId(), 20);
    await awardsService.registerMiles(client.getId(), transit.getId());
    await awardsService.registerMiles(client.getId(), transit.getId());

    //then
    const account = await load(client.getId());
    expect(account.getTransactions()).toEqual(3);
    const miles = await awardsService.calculateBalance(client.getId());
    expect(miles).toEqual(40);
  });

  it('should transfer miles', async () => {
    //given
    const client = await fixtures.aClient();
    const secondClient = await fixtures.aClient();
    //and
    await fixtures.activeAwardsAccount(client);
    await fixtures.activeAwardsAccount(secondClient);
    //and
    await awardsService.registerSpecialMiles(client.getId(), 10);

    //when
    await awardsService.transferMiles(client.getId(), secondClient.getId(), 10);

    //then
    const firstClientBalance = await awardsService.calculateBalance(
      client.getId(),
    );
    const secondClientBalance = await awardsService.calculateBalance(
      secondClient.getId(),
    );
    expect(firstClientBalance).toEqual(0);
    expect(secondClientBalance).toEqual(10);
  });

  it('should not transfer miles when account is not active', async () => {
    //given
    const client = await fixtures.aClient();
    const secondClient = await fixtures.aClient();
    //and
    await fixtures.activeAwardsAccount(client);
    await fixtures.activeAwardsAccount(secondClient);
    //and
    await awardsService.registerSpecialMiles(client.getId(), 10);
    //and
    awardsService.deactivateAccount(client.getId());

    //when
    await awardsService.transferMiles(client.getId(), secondClient.getId(), 5);

    //then
    const firstClientBalance = await awardsService.calculateBalance(
      client.getId(),
    );
    expect(firstClientBalance).toEqual(10);
  });

  it('should not transfer miles when not enough', async () => {
    //given
    const client = await fixtures.aClient();
    const secondClient = await fixtures.aClient();
    //and
    await fixtures.activeAwardsAccount(client);
    await fixtures.activeAwardsAccount(secondClient);
    //and
    await awardsService.registerSpecialMiles(client.getId(), 10);

    //when
    await awardsService.transferMiles(client.getId(), secondClient.getId(), 30);

    //then
    const firstClientBalance = await awardsService.calculateBalance(
      client.getId(),
    );
    expect(firstClientBalance).toEqual(10);
  });

  it('should remove miles', async () => {
    //given
    const client = await fixtures.aClient();
    //and
    await fixtures.activeAwardsAccount(client);
    //and
    const transit = await fixtures.aTransit(null, 80);

    //and
    await awardsService.registerMiles(client.getId(), transit.getId());
    await awardsService.registerMiles(client.getId(), transit.getId());
    await awardsService.registerMiles(client.getId(), transit.getId());

    //when
    await awardsService.removeMiles(client.getId(), 20);

    //then
    const miles = await awardsService.calculateBalance(client.getId());
    expect(miles).toEqual(10);
  });

  it('should not remove more than client has miles', async () => {
    //given
    const client = await fixtures.aClient();
    //and
    await fixtures.activeAwardsAccount(client);
    //and
    const transit = await fixtures.aTransit(null, 80);

    //and
    await awardsService.registerMiles(client.getId(), transit.getId());
    await awardsService.registerMiles(client.getId(), transit.getId());
    await awardsService.registerMiles(client.getId(), transit.getId());

    //expect
    await expect(() =>
      awardsService.removeMiles(client.getId(), 40),
    ).rejects.toThrow(NotAcceptableException);
  });

  it('should not add miles if account is not active', async () => {
    //given
    const client = await fixtures.aClient();
    //and
    await awardsService.registerToProgram(client.getId());
    //and
    const transit = await fixtures.aTransit(null, 80);
    //and
    const currentMiles = await awardsService.calculateBalance(client.getId());

    //when
    await awardsService.registerMiles(client.getId(), transit.getId());

    //then
    const miles = await awardsService.calculateBalance(client.getId());
    expect(miles).toEqual(currentMiles);
  });

  function load(clientId: string): Promise<AwardsAccountDto> {
    return awardsService.findBy(clientId);
  }

  function loadAwardedMiles(client: Client): Promise<AwardedMiles[]> {
    return awardedMilesRepository.findAllByClient(client);
  }
});
