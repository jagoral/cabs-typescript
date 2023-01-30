import { BaseEntity } from 'src/common/base.entity';
import { Column, Entity, PrimaryColumn } from 'typeorm';
import { Claim, ClaimStatus } from './claim.entity';
import { Type as ClientType } from './client.entity';
import { Transit } from './transit.entity';

export enum WhoToAsk {
  ASK_DRIVER = 'ASK_DRIVER',
  ASK_CLIENT = 'ASK_CLIENT',
  ASK_NOONE = 'ASK_NOONE',
}

interface ClaimResolveResult {
  whoToAsk: WhoToAsk;
  decision: ClaimStatus;
}

function toResult(
  whoToAsk: WhoToAsk,
  decision: ClaimStatus,
): ClaimResolveResult {
  return { whoToAsk, decision };
}

export interface ResolveClaimConfig {
  automaticRefundForVipThreshold: number;
  numberOfTransits: number;
  noOfTransitsForClaimAutomaticRefund: number;
}

@Entity()
export class ClaimResolver extends BaseEntity {
  @PrimaryColumn()
  private clientId: string;

  @Column('simple-array')
  private claimedTransitIds: string[] = [];

  constructor(clientId: string) {
    super();
    this.clientId = clientId;
  }

  public resolveClaim(
    claim: Claim,
    config: ResolveClaimConfig,
  ): ClaimResolveResult {
    const {
      automaticRefundForVipThreshold,
      numberOfTransits,
      noOfTransitsForClaimAutomaticRefund,
    } = config;
    const transitId = claim.getTransit().getId();
    if (this.claimedTransitIds.includes(transitId)) {
      return toResult(WhoToAsk.ASK_NOONE, ClaimStatus.ESCALATED);
    }
    this.addNewClaimFor(claim.getTransit());
    if (this.numberOfClaims() <= 3) {
      return toResult(WhoToAsk.ASK_NOONE, ClaimStatus.REFUNDED);
    }
    if (claim.getOwner().getType() === ClientType.VIP) {
      if (
        claim.getTransit().getPrice()!.toInt() < automaticRefundForVipThreshold
      ) {
        return toResult(WhoToAsk.ASK_NOONE, ClaimStatus.REFUNDED);
      } else {
        return toResult(WhoToAsk.ASK_DRIVER, ClaimStatus.ESCALATED);
      }
    } else {
      if (numberOfTransits >= noOfTransitsForClaimAutomaticRefund) {
        if (
          claim.getTransit().getPrice()!.toInt() <
          automaticRefundForVipThreshold
        ) {
          return toResult(WhoToAsk.ASK_NOONE, ClaimStatus.REFUNDED);
        } else {
          return toResult(WhoToAsk.ASK_CLIENT, ClaimStatus.ESCALATED);
        }
      } else {
        return toResult(WhoToAsk.ASK_DRIVER, ClaimStatus.ESCALATED);
      }
    }
  }

  private addNewClaimFor(transit: Transit) {
    this.claimedTransitIds = [...this.claimedTransitIds, transit.getId()];
  }

  private numberOfClaims(): number {
    return this.claimedTransitIds.length;
  }
}
