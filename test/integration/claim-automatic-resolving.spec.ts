import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { AppProperties } from 'src/config/app-properties.config';
import { ClaimStatus, CompletionMode } from 'src/entity/claim.entity';
import { Client, Type as ClientType } from 'src/entity/client.entity';
import { Driver } from 'src/entity/driver.entity';
import { AwardsService } from 'src/service/awards.service';
import { ClaimService } from 'src/service/claim.service';
import { ClientNotificationService } from 'src/service/client-notification.service';
import { DriverNotificationService } from 'src/service/driver-notification.service';
import * as fixtures from 'test/common/fixtures';

describe('Claim automatic resolving', () => {
  let claimService: ClaimService;
  let testingModule: TestingModule;
  const awardsServiceMock = {
    registerSpecialMiles: jest.fn(),
  };
  const clientNotificationsServiceMock = {
    notifyClientAboutRefund: jest.fn(),
    askForMoreInformation: jest.fn(),
  };
  const appPropertiesMock = {
    getAutomaticRefundForVipThreshold: jest.fn(),
    getNoOfTransitsForClaimAutomaticRefund: jest.fn(),
  };
  const driverNotificationsServiceMock = {
    askDriverForDetailsAboutClaim: jest.fn(),
  };

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AwardsService)
      .useValue(awardsServiceMock)
      .overrideProvider(ClientNotificationService)
      .useValue(clientNotificationsServiceMock)
      .overrideProvider(AppProperties)
      .useValue(appPropertiesMock)
      .overrideProvider(DriverNotificationService)
      .useValue(driverNotificationsServiceMock)
      .compile();

    claimService = testingModule.get(ClaimService);
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should second claim for the same transit be escalated', async () => {
    //given
    lowCostThresholdIs(40);
    //and
    const [driver, client] = await Promise.all([
      fixtures.aDriver(),
      fixtures.aClient(ClientType.VIP),
    ]);
    //and
    const transit = await aTransit(client, driver, 39);
    //and
    let claim = await fixtures.createClaim(client, transit);
    //and
    claim = await claimService.tryToResolveAutomatically(claim.getId());
    //and
    let claim2 = await fixtures.createClaim(client, transit);

    //when
    claim2 = await claimService.tryToResolveAutomatically(claim2.getId());

    //then
    expect(claim.getStatus()).toEqual(ClaimStatus.REFUNDED);
    expect(claim.getCompletionMode()).toEqual(CompletionMode.AUTOMATIC);
    expect(claim2.getStatus()).toEqual(ClaimStatus.ESCALATED);
    expect(claim2.getCompletionMode()).toEqual(CompletionMode.MANUAL);
  });

  it('should low cost transits be refunded if client is vip', async () => {
    //given
    lowCostThresholdIs(40);
    //and
    const [driver, client] = await Promise.all([
      fixtures.aDriver(),
      fixtures.aClientWithClaims(ClientType.VIP, 3),
    ]);
    //and
    const transit = await aTransit(client, driver, 39);
    //and
    let claim = await fixtures.createClaim(client, transit);

    //when
    claim = await claimService.tryToResolveAutomatically(claim.getId());

    //then
    expect(claim.getStatus()).toEqual(ClaimStatus.REFUNDED);
    expect(claim.getCompletionMode()).toEqual(CompletionMode.AUTOMATIC);
    expect(
      clientNotificationsServiceMock.notifyClientAboutRefund,
    ).toBeCalledWith(claim.getClaimNo(), client.getId());
    expect(awardsServiceMock.registerSpecialMiles).toBeCalledWith(
      claim.getOwner().getId(),
      10,
    );
  });

  it('should high cost transits be escalated even when client is vip', async () => {
    //given
    lowCostThresholdIs(40);
    //and
    const [driver, client] = await Promise.all([
      fixtures.aDriver(),
      fixtures.aClientWithClaims(ClientType.VIP, 3),
    ]);
    //and
    const transit = await aTransit(client, driver, 41);
    //and
    let claim = await fixtures.createClaim(client, transit);

    //when
    claim = await claimService.tryToResolveAutomatically(claim.getId());

    //then
    expect(claim.getStatus()).toEqual(ClaimStatus.ESCALATED);
    expect(claim.getCompletionMode()).toEqual(CompletionMode.MANUAL);
    expect(
      driverNotificationsServiceMock.askDriverForDetailsAboutClaim,
    ).toBeCalledWith(claim.getClaimNo(), driver.getId());
    expect(awardsServiceMock.registerSpecialMiles).not.toBeCalled();
  });

  it('should first three claims be refunded', async () => {
    //given
    lowCostThresholdIs(40);
    //and
    noOfTransitsForAutomaticRefundIs(10);
    //and
    const [driver, client] = await Promise.all([
      fixtures.aDriver(),
      aClient(ClientType.NORMAL),
    ]);
    //and

    //when
    const createResolvedClaim = async () => {
      const claim = await fixtures.createClaim(
        client,
        await aTransit(client, driver, 50),
      );
      return claimService.tryToResolveAutomatically(claim.getId());
    };
    const claim1 = await createResolvedClaim();
    const claim2 = await createResolvedClaim();
    const claim3 = await createResolvedClaim();
    const claim4 = await createResolvedClaim();

    //then
    expect(claim1.getStatus()).toEqual(ClaimStatus.REFUNDED);
    expect(claim2.getStatus()).toEqual(ClaimStatus.REFUNDED);
    expect(claim3.getStatus()).toEqual(ClaimStatus.REFUNDED);
    expect(claim4.getStatus()).toEqual(ClaimStatus.ESCALATED);
    expect(claim1.getCompletionMode()).toEqual(CompletionMode.AUTOMATIC);
    expect(claim2.getCompletionMode()).toEqual(CompletionMode.AUTOMATIC);
    expect(claim3.getCompletionMode()).toEqual(CompletionMode.AUTOMATIC);
    expect(claim4.getCompletionMode()).toEqual(CompletionMode.MANUAL);
    expect(
      clientNotificationsServiceMock.notifyClientAboutRefund,
    ).toBeCalledWith(claim1.getClaimNo(), client.getId());
    expect(
      clientNotificationsServiceMock.notifyClientAboutRefund,
    ).toBeCalledWith(claim2.getClaimNo(), client.getId());
    expect(
      clientNotificationsServiceMock.notifyClientAboutRefund,
    ).toBeCalledWith(claim3.getClaimNo(), client.getId());
    expect(awardsServiceMock.registerSpecialMiles).not.toBeCalled();
  });

  it('should low cost transits be refunded when many transits', async () => {
    //given
    lowCostThresholdIs(40);
    //and
    noOfTransitsForAutomaticRefundIs(10);
    //and
    const client = await fixtures.aClientWithClaims(ClientType.NORMAL, 3);
    //and
    await fixtures.clientHasDoneTransits(client, 12);
    //and
    const transit = await aTransit(client, await fixtures.aDriver(), 39);
    //and
    let claim = await fixtures.createClaim(client, transit);

    //when
    claim = await claimService.tryToResolveAutomatically(claim.getId());

    //then
    expect(claim.getStatus()).toEqual(ClaimStatus.REFUNDED);
    expect(claim.getCompletionMode()).toEqual(CompletionMode.AUTOMATIC);
    expect(
      clientNotificationsServiceMock.notifyClientAboutRefund,
    ).toBeCalledWith(claim.getClaimNo(), client.getId());
    expect(awardsServiceMock.registerSpecialMiles).not.toBeCalled();
  });

  it('should high cost transits are escalated even with many transits', async () => {
    //given
    lowCostThresholdIs(40);
    //and
    noOfTransitsForAutomaticRefundIs(10);
    //and
    const client = await fixtures.aClientWithClaims(ClientType.NORMAL, 3);
    //and
    await fixtures.clientHasDoneTransits(client, 12);
    //and
    let claim = await fixtures.createClaim(
      client,
      await aTransit(client, await fixtures.aDriver(), 50),
    );

    //when
    claim = await claimService.tryToResolveAutomatically(claim.getId());

    //then
    expect(claim.getStatus()).toEqual(ClaimStatus.ESCALATED);
    expect(claim.getCompletionMode()).toEqual(CompletionMode.MANUAL);
    expect(clientNotificationsServiceMock.askForMoreInformation).toBeCalledWith(
      claim.getClaimNo(),
      client.getId(),
    );
    expect(awardsServiceMock.registerSpecialMiles).not.toBeCalled();
  });

  it('should high cost transits be escalated when few transits', async () => {
    //given
    lowCostThresholdIs(40);
    //and
    noOfTransitsForAutomaticRefundIs(10);
    //and
    const [client, driver] = await Promise.all([
      fixtures.aClientWithClaims(ClientType.NORMAL, 3),
      fixtures.aDriver(),
    ]);
    //and
    await fixtures.clientHasDoneTransits(client, 2);
    //and
    let claim = await fixtures.createClaim(
      client,
      await aTransit(client, driver, 50),
    );

    //when
    claim = await claimService.tryToResolveAutomatically(claim.getId());

    //then
    expect(claim.getStatus()).toEqual(ClaimStatus.ESCALATED);
    expect(claim.getCompletionMode()).toEqual(CompletionMode.MANUAL);
    expect(
      driverNotificationsServiceMock.askDriverForDetailsAboutClaim,
    ).toBeCalledWith(claim.getClaimNo(), driver.getId());
    expect(awardsServiceMock.registerSpecialMiles).not.toBeCalled();
  });

  async function aTransit(client: Client, driver: Driver, price: number) {
    return fixtures.aCompletedTransit(price, new Date(), { client, driver });
  }

  async function lowCostThresholdIs(price: number): Promise<void> {
    appPropertiesMock.getAutomaticRefundForVipThreshold.mockImplementation(
      () => price,
    );
  }

  async function noOfTransitsForAutomaticRefundIs(no: number): Promise<void> {
    appPropertiesMock.getNoOfTransitsForClaimAutomaticRefund.mockImplementation(
      () => no,
    );
  }

  function aClient(clientType: ClientType): Promise<Client> {
    return fixtures.aClientWithClaims(clientType, 0);
  }
});
