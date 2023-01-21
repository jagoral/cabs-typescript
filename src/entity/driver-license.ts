import { NotAcceptableException } from '@nestjs/common';

export class DriverLicense {
  public static readonly DRIVER_LICENSE_REGEX =
    '^[A-Z9]{5}\\d{6}[A-Z9]{2}\\d[A-Z]{2}$';

  private constructor(private readonly driverLicense: string) {}

  public static withLicense(driverLicense: string): DriverLicense {
    if (
      !driverLicense ||
      !driverLicense.match(DriverLicense.DRIVER_LICENSE_REGEX)
    ) {
      throw new NotAcceptableException('Illegal license no = ' + driverLicense);
    }
    return new DriverLicense(driverLicense);
  }

  public static withoutValidation(driverLicense: string): DriverLicense {
    return new DriverLicense(driverLicense);
  }

  public toString(): string {
    return `DriverLicense{driverLicense='${this.driverLicense}'}`;
  }

  public asString(): string {
    return this.driverLicense;
  }
}
