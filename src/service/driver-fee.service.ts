import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DriverFeeRepository } from '../repository/driver-fee.repository';
import { TransitRepository } from '../repository/transit.repository';
import { FeeType } from '../entity/driver-fee.entity';
import { Money } from 'src/money/money';

@Injectable()
export class DriverFeeService {
  constructor(
    @InjectRepository(DriverFeeRepository)
    private driverFeeRepository: DriverFeeRepository,
    @InjectRepository(TransitRepository)
    private transitRepository: TransitRepository,
  ) {}

  public async calculateDriverFee(transitId: string) {
    const transit = await this.transitRepository.findOne(transitId);
    if (!transit) {
      throw new NotFoundException('transit does not exist, id = ' + transitId);
    }
    if (transit.getDriversFee() != null) {
      return transit.getDriversFee();
    }
    const transitPrice = transit.getPrice() ?? Money.ZERO;

    const driver = transit.getDriver();

    if (!driver) {
      throw new NotFoundException(
        'driver not exist for transit = ' + transitId,
      );
    }
    const driverFee = await this.driverFeeRepository.findByDriver(driver);
    if (!driverFee) {
      throw new NotFoundException(
        'driver Fees not defined for driver, driver id = ' + driver.getId(),
      );
    }
    let finalFee;
    if (driverFee.getFeeType() === FeeType.FLAT) {
      finalFee = transitPrice.subtract(new Money(driverFee.getAmount()));
    } else {
      finalFee = transitPrice.percentage(driverFee.getAmount());
    }

    return new Money(
      Math.max(
        finalFee.toInt(),
        driverFee.getMin() == null ? 0 : driverFee.getMin().toInt(),
      ),
    );
  }
}
