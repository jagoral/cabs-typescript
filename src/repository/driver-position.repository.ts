import { Between, EntityRepository, Repository } from 'typeorm';
import { DriverPosition } from '../entity/driver-position.entity';
import { Driver } from '../entity/driver.entity';
import { DriverPositionV2Dto } from '../dto/driver-position-v2.dto';

@EntityRepository(DriverPosition)
export class DriverPositionRepository extends Repository<DriverPosition> {
  public async findAverageDriverPositionSince(
    latitudeMin: number,
    latitudeMax: number,
    longitudeMin: number,
    longitudeMax: number,
    date: number,
  ): Promise<DriverPositionV2Dto[]> {
    let driverPosition = await this.createQueryBuilder('driverPosition')
      .leftJoinAndSelect('driverPosition.driver', 'p')
      .select(
        `AVG(latitude) AS latitude, AVG(longitude) AS longitude, MAX("seenAt") AS "seenAt", "driverId"`,
      )
      .where('longitude between :longitudeMin and :longitudeMax')
      .andWhere('latitude between :latitudeMin and :latitudeMax')
      .andWhere('"seenAt" >= :seenAt')
      .groupBy('"driverId"')
      .setParameters({
        latitudeMin,
        latitudeMax,
        longitudeMin,
        longitudeMax,
        seenAt: date,
      })
      .printSql()
      .getRawMany();
    // it could be optimized
    driverPosition = await Promise.all(
      driverPosition.map(async (dp) => ({
        ...dp,
        driver: await this.findOneOrFail({
          relations: ['driver'],
          where: { driver: { id: dp.driverId } },
        }).then((position) => position.driver),
      })),
    );

    return driverPosition.map(
      (dp) =>
        new DriverPositionV2Dto(
          dp.driver,
          dp.latitude,
          dp.longitude,
          dp.seenAt,
        ),
    );
  }

  public async findByDriverAndSeenAtBetweenOrderBySeenAtAsc(
    driver: Driver,
    from: number,
    to: number,
  ): Promise<DriverPosition[]> {
    return this.find({
      where: {
        driver,
        seenAt: Between(from, to),
      },
      order: {
        seenAt: 'ASC',
      },
    });
  }
}
