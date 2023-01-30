import { Distance } from 'src/distance/distance';
import { ClaimDto } from 'src/dto/claim.dto';
import { CreateCarTypeDto } from 'src/dto/create-car-type.dto';
import { CreateClaimDto } from 'src/dto/create-claim.dto';
import { CreateTransitDto } from 'src/dto/create-transit.dto';
import { Address } from 'src/entity/address.entity';
import { CarClass } from 'src/entity/car-type.entity';
import { Claim } from 'src/entity/claim.entity';
import {
  Client,
  PaymentType,
  Type as ClientType,
} from 'src/entity/client.entity';
import { DriverFee, FeeType } from 'src/entity/driver-fee.entity';
import { Driver, DriverStatus } from 'src/entity/driver.entity';
import { Transit } from 'src/entity/transit.entity';
import { Money } from 'src/money/money';
import { AddressRepository } from 'src/repository/address.repository';
import { ClientRepository } from 'src/repository/client.repository';
import { DriverFeeRepository } from 'src/repository/driver-fee.repository';
import { TransitRepository } from 'src/repository/transit.repository';
import { AwardsService } from 'src/service/awards.service';
import { CarTypeService } from 'src/service/car-type.service';
import { ClaimService } from 'src/service/claim.service';
import { DriverService } from 'src/service/driver.service';
import { getTestService } from 'test/setup/test-server';
import { TransitOverrides, CompletedTransitOverrides } from './fixtures.types';

export async function aClient(clientType = ClientType.NORMAL): Promise<Client> {
  const clientRepository = await getTestService(ClientRepository);
  const awardService = await getTestService(AwardsService);
  const client = new Client();
  client.setType(clientType);
  client.setName('Jan');
  client.setLastName('Kowalski');
  client.setDefaultPaymentType(PaymentType.PRE_PAID);
  const entity = await clientRepository.save(client);
  await awardService.registerToProgram(entity.getId());
  return entity;
}

export async function createClaim(
  client: Client,
  transit: Transit,
  overrides?: CreateClaimDto,
): Promise<Claim> {
  let createClaimDto = overrides;
  if (!createClaimDto) {
    createClaimDto = new CreateClaimDto();
    createClaimDto.incidentDescription = 'Okradli mnie na hajs';
    createClaimDto.reason = '$$$';
    createClaimDto.clientId = client.getId();
    createClaimDto.transitId = transit.getId();
  }
  const claimDto = new ClaimDto(createClaimDto);
  claimDto.setDraft(false);
  const claimService = await getTestService(ClaimService);
  return claimService.create(claimDto);
}

export async function createAndResolveClaim(
  client: Client,
  transit: Transit,
): Promise<Claim> {
  const claim = await createClaim(client, transit);
  const claimService = await getTestService(ClaimService);
  return claimService.tryToResolveAutomatically(claim.getId());
}

export async function clientHasDoneClaims(
  client: Client,
  noOfClaims: number,
): Promise<void> {
  const resolveClaim = async () => {
    const driver = await aDriver();
    const transit = await aTransit(driver, 20, new Date(), { client });
    return createAndResolveClaim(client, transit);
  };

  for (let i = 0; i < noOfClaims; i++) {
    await resolveClaim();
  }
}

export async function aClientWithClaims(
  clientType: ClientType,
  noOfClaims: number,
): Promise<Client> {
  const client = await aClient(clientType);
  await clientHasDoneClaims(client, noOfClaims);
  return client;
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
  overrides: TransitOverrides = {},
): Promise<Transit> {
  const transitRepository = await getTestService(TransitRepository);
  const { address, client } = overrides;
  const transit = new Transit({
    when,
    distance: Distance.ofKm(10),
    carClass: CarClass.VAN,
    client: client || (await aClient()),
    from: address?.from || (await anAddress()),
    to: address?.to || (await anAddress()),
  });
  transit.setPrice(new Money(price));
  if (driver) {
    transit.proposeTo(driver);
    transit.acceptBy(driver, when);
  }
  return transitRepository.save(transit);
}

export async function aCompletedTransit(
  price: number,
  when = new Date(),
  overrides: CompletedTransitOverrides = {},
): Promise<Transit> {
  const { driver, ...transitOverrides } = overrides;
  const [toAddress, fromAddress] = await Promise.all([
    anAddress(),
    anAddress(),
  ]);
  const transit = await aTransit(driver || (await aDriver()), price, when, {
    address: {
      from: fromAddress,
      to: toAddress,
    },
    ...transitOverrides,
  });
  return transit;
}

export async function clientHasDoneTransits(
  client: Client,
  noOfTransits: number,
): Promise<void> {
  const toCompletedTransit = async () =>
    aCompletedTransit(10, new Date(), { client, driver: await aDriver() });

  await Promise.all(
    Array.from({ length: noOfTransits }).map(toCompletedTransit),
  );
}

export async function aTransitDTO(
  pickup: CreateTransitDto['from'],
  destination: CreateTransitDto['to'],
  client?: Client,
): Promise<CreateTransitDto> {
  const transitDto = new CreateTransitDto();
  transitDto.from = pickup;
  transitDto.to = destination;
  transitDto.clientId =
    client?.getId() || (await aClient().then((c) => c.getId()));
  return transitDto;
}

export async function anActiveCarCategory(carClass: CarClass) {
  const carTypeService = await getTestService(CarTypeService);
  const carTypeDto = new CreateCarTypeDto();
  carTypeDto.carClass = carClass;
  carTypeDto.description = 'opis';
  const carType = await carTypeService.create(carTypeDto);
  for (let i = 0; i < carType.getMinNoOfCarsToActivateClass(); i++) {
    await carTypeService.registerCar(carType.getCarClass());
  }
  await carTypeService.activate(carType.getId());
  return carType;
}
