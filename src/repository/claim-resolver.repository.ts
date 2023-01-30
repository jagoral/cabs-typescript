import { ClaimResolver } from 'src/entity/claim-resolver.entity';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(ClaimResolver)
export class ClaimResolverRepository extends Repository<ClaimResolver> {
  public async findByClientId(
    clientId: string,
  ): Promise<ClaimResolver | undefined> {
    return this.findOne({ where: { clientId } });
  }
}
