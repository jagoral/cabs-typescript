import { Address } from 'src/entity/address.entity';
import { CarClass } from 'src/entity/car-type.entity';
import {
  Client,
  PaymentType,
  Type as ClientType,
} from 'src/entity/client.entity';
import { DriverFee, FeeType } from 'src/entity/driver-fee.entity';
import { Driver, DriverStatus } from 'src/entity/driver.entity';
import { Status, Transit } from 'src/entity/transit.entity';
import { Money } from 'src/money/money';
import { AddressRepository } from 'src/repository/address.repository';
import { ClientRepository } from 'src/repository/client.repository';
import { DriverFeeRepository } from 'src/repository/driver-fee.repository';
import { TransitRepository } from 'src/repository/transit.repository';
import { DriverService } from 'src/service/driver.service';
import { getTestService } from 'test/setup/test-server';

export async function aClient() {
  const clientRepository = await getTestService(ClientRepository);
  const client = new Client();
  client.setType(ClientType.NORMAL);
  client.setName('Jan');
  client.setLastName('Kowalski');
  client.setDefaultPaymentType(PaymentType.PRE_PAID);
  return clientRepository.save(client);
}

export async function anAddress(): Promise<Address> {
  const addressRepository = await getTestService(AddressRepository);
  const address = new Address('PL', 'Warszawa', 'ul. Testowa 1', 1);
  address.setPostalCode('51503');
  address.setName('Jan Kowalski');
  return addressRepository.save(address);
}

export async function driverHasFee(
  driver: Driver,
  fee: { feeType: FeeType; amount: number; min?: number },
): Promise<DriverFee> {
  const feeRepository = await getTestService(DriverFeeRepository);
  const driverFee = new DriverFee(
    fee.feeType,
    driver,
    fee.amount,
    fee.min || 0,
  );
  return feeRepository.save(driverFee);
}

export async function aDriver(): Promise<Driver> {
  const driverService = await getTestService(DriverService);
  return driverService.createDriver(
    {
      driverLicense: 'FARME100165AB5EW',
      firstName: 'Janusz',
      lastName: 'Kowalski',
      photo: 'c3RyaW5n',
    },
    DriverStatus.ACTIVE,
  );
}

export async function aTransit(
  driver: Driver | null,
  price: number,
  when = new Date(),
): Promise<Transit> {
  const transitRepository = await getTestService(TransitRepository);
  const transit = new Transit();
  transit.setPrice(new Money(price));
  transit.setDriver(driver);
  transit.setDateTime(when.getTime());
  transit.setStatus(Status.DRAFT);
  transit.setCarType(CarClass.ECO);
  return transitRepository.save(transit);
}

export async function aCompletedTransit(
  price: number,
  when = new Date(),
): Promise<Transit> {
  const transitRepository = await getTestService(TransitRepository);
  const transit = await aTransit(null, price, when);
  const [toAddress, fromAddress] = await Promise.all([
    anAddress(),
    anAddress(),
  ]);
  transit.setTo(toAddress);
  transit.setFrom(fromAddress);
  transit.setClient(await aClient());
  return transitRepository.save(transit);
}
