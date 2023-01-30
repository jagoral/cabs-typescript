import { Distance } from 'src/distance/distance';
import { Money } from 'src/money/money';
import { Address } from './address.entity';
import { CarClass } from './car-type.entity';
import {
  ClaimResolver,
  ResolveClaimConfig,
  WhoToAsk,
} from './claim-resolver.entity';
import { Claim, ClaimStatus } from './claim.entity';
import { Client, Type as ClientType } from './client.entity';
import { Status, Transit } from './transit.entity';

describe('ClaimResolverEntity', () => {
  it('should second claim for the same transit be escalated', () => {
    //given
    const { resolveClaim } = getClaimResolver();
    //and
    const transit = aTransit('1', 39);
    //and
    const claim = createClaim(transit);
    resolveClaim(claim);
    //and
    const claim2 = createClaim(transit);

    //when
    const result = resolveClaim(claim2);

    //then
    expect(result).toEqual({
      whoToAsk: WhoToAsk.ASK_NOONE,
      decision: ClaimStatus.ESCALATED,
    });
  });

  it('should low cost transits be refunded if client is vip', () => {
    //given
    const { resolveClaim } = getClaimResolver();
    //and
    const transit = aTransit('1', 39);
    //and
    const claim = createClaim(transit);

    //when
    const result = resolveClaim(claim);

    //then
    expect(result).toEqual({
      whoToAsk: WhoToAsk.ASK_NOONE,
      decision: ClaimStatus.REFUNDED,
    });
  });

  it('should high cost transits be escalated even when client is vip', () => {
    //given
    const { resolveClaim } = getClaimResolver();
    //and
    const claim = createClaim(aTransit('1', 39));
    resolveClaim(claim);
    const claim2 = createClaim(aTransit('2', 39));
    resolveClaim(claim2);
    const claim3 = createClaim(aTransit('3', 39));
    resolveClaim(claim3);
    //and
    const claim4 = createClaim(aTransit('4', 41), aClient(ClientType.VIP));

    //when
    const result = resolveClaim(claim4);

    //then
    expect(result).toEqual({
      whoToAsk: WhoToAsk.ASK_DRIVER,
      decision: ClaimStatus.ESCALATED,
    });
  });

  it('should first three claims be refunded', () => {
    //given
    const { resolveClaim } = getClaimResolver();
    //and
    const claim = createClaim(aTransit('1', 39));
    const result1 = resolveClaim(claim);
    const claim2 = createClaim(aTransit('2', 39));
    const result2 = resolveClaim(claim2);
    const claim3 = createClaim(aTransit('3', 39));
    const result3 = resolveClaim(claim3);

    //when
    const claim4 = createClaim(aTransit('4', 41), aClient(ClientType.NORMAL));
    const result4 = resolveClaim(claim4, {
      numberOfTransits: 4,
      noOfTransitsForClaimAutomaticRefund: 10,
    });

    //then
    expect(result1).toEqual({
      whoToAsk: WhoToAsk.ASK_NOONE,
      decision: ClaimStatus.REFUNDED,
    });
    expect(result2).toEqual({
      whoToAsk: WhoToAsk.ASK_NOONE,
      decision: ClaimStatus.REFUNDED,
    });
    expect(result3).toEqual({
      whoToAsk: WhoToAsk.ASK_NOONE,
      decision: ClaimStatus.REFUNDED,
    });
    expect(result4).toEqual({
      whoToAsk: WhoToAsk.ASK_DRIVER,
      decision: ClaimStatus.ESCALATED,
    });
  });

  it('should low cost transits be refunded when many transits', () => {
    //given
    const { resolveClaim } = getClaimResolver();
    //and
    const claim = createClaim(aTransit('1', 39));
    resolveClaim(claim);
    const claim2 = createClaim(aTransit('2', 39));
    resolveClaim(claim2);
    const claim3 = createClaim(aTransit('3', 39));
    resolveClaim(claim3);
    //and
    const claim4 = createClaim(aTransit('4', 39), aClient(ClientType.NORMAL));

    //when
    const result = resolveClaim(claim4, {
      numberOfTransits: 10,
      noOfTransitsForClaimAutomaticRefund: 9,
    });

    //then
    expect(result).toEqual({
      whoToAsk: WhoToAsk.ASK_NOONE,
      decision: ClaimStatus.REFUNDED,
    });
  });

  it('should high cost transits be escalated even with many transits', () => {
    //given
    const { resolveClaim } = getClaimResolver();
    //and
    const claim = createClaim(aTransit('1', 39));
    resolveClaim(claim);
    const claim2 = createClaim(aTransit('2', 39));
    resolveClaim(claim2);
    const claim3 = createClaim(aTransit('3', 39));
    resolveClaim(claim3);
    //and
    const claim4 = createClaim(aTransit('4', 50), aClient(ClientType.NORMAL));

    //when
    const result = resolveClaim(claim4, {
      numberOfTransits: 12,
      noOfTransitsForClaimAutomaticRefund: 10,
    });

    //then
    expect(result).toEqual({
      whoToAsk: WhoToAsk.ASK_CLIENT,
      decision: ClaimStatus.ESCALATED,
    });
  });

  it('should high cost transits be escalated when few transits', () => {
    //given
    const { resolveClaim } = getClaimResolver();
    //and
    const claim = createClaim(aTransit('1', 39));
    resolveClaim(claim);
    const claim2 = createClaim(aTransit('2', 39));
    resolveClaim(claim2);
    const claim3 = createClaim(aTransit('3', 39));
    resolveClaim(claim3);
    //and
    const claim4 = createClaim(aTransit('4', 50), aClient(ClientType.NORMAL));

    //when
    const result = resolveClaim(claim4, {
      numberOfTransits: 2,
      noOfTransitsForClaimAutomaticRefund: 10,
    });

    //then
    expect(result).toEqual({
      whoToAsk: WhoToAsk.ASK_DRIVER,
      decision: ClaimStatus.ESCALATED,
    });
  });

  function getClaimResolver(clientId = 'clientId') {
    const resolver = new ClaimResolver(clientId);
    return {
      resolveClaim: (
        claim: Claim,
        overrides: Partial<ResolveClaimConfig> = {},
      ) => {
        return resolver.resolveClaim(claim, {
          automaticRefundForVipThreshold: 40,
          numberOfTransits: 15,
          noOfTransitsForClaimAutomaticRefund: 10,
          ...overrides,
        });
      },
    };
  }

  function aTransit(id: string, price: number): Transit {
    const transit = new Transit({
      id,
      from: new Address('PL', 'Warszawa', 'Testowa', 1),
      to: new Address('PL', 'Warszawa', 'Testowa', 1),
      status: Status.DRAFT,
      client: new Client(),
      carClass: CarClass.ECO,
      when: new Date(),
      distance: Distance.ofKm(10),
    });
    transit.setPrice(new Money(price));
    return transit;
  }

  function createClaim(transit: Transit, client?: Client): Claim {
    const claim = new Claim();
    claim.setTransit(transit);
    if (client) {
      claim.setOwner(client);
    }
    return claim;
  }

  function aClient(type: ClientType): Client {
    const client = new Client();
    client.setType(type);
    return client;
  }
});
