import { CarClass } from '../entity/car-type.entity';
import { Status, Transit } from '../entity/transit.entity';
import { Distance } from './../distance/distance';
import { AddressDto } from './address.dto';
import { ClaimDto } from './claim.dto';
import { ClientDto } from './client.dto';
import { DriverDto } from './driver.dto';

export class TransitDto {
  public id: string;

  public tariff: string;

  public status: Status;

  public driver: DriverDto;

  public factor: number | null;

  public distance: Distance;

  public distanceUnit: string;

  public kmRate: number;

  public price: number;

  public driverFee: number;

  public estimatedPrice: number;

  public baseFee: number;

  public date: number;

  public dateTime: number;

  public published: number;

  public acceptedAt: number | null;

  public started: number | null;

  public completeAt: number | null;

  public claimDto: ClaimDto;

  public proposedDrivers: DriverDto[] = [];

  public to: AddressDto;

  public from: AddressDto;

  public carClass: CarClass;

  public clientDto: ClientDto;

  constructor(transit: Transit) {
    this.id = transit.getId();
    this.distance = transit.getKm();
    this.factor = 1;
    const price = transit.getPrice();
    if (price) {
      this.price = price.toInt();
    }
    this.date = transit.getDateTime();
    this.status = transit.getStatus();
    this.tariff = transit.getTariff().getName();
    this.kmRate = transit.getTariff().getKmRate();
    this.baseFee = transit.getTariff().getBaseFee();
    for (const d of transit.getProposedDrivers()) {
      this.proposedDrivers.push(new DriverDto(d));
    }
    this.to = new AddressDto(transit.getTo());
    this.from = new AddressDto(transit.getFrom());
    this.carClass = transit.getCarType();
    this.clientDto = new ClientDto(transit.getClient());
    if (transit.getDriversFee() != null) {
      this.driverFee = transit.getDriversFee().toInt();
    }
    const estimatedPrice = transit.getEstimatedPrice();
    if (estimatedPrice) {
      this.estimatedPrice = estimatedPrice.toInt();
    }
    this.dateTime = transit.getDateTime();
    this.published = transit.getPublished();
    this.acceptedAt = transit.getAcceptedAt();
    this.started = transit.getStarted();
    this.completeAt = transit.getCompleteAt();
  }

  public getKmRate() {
    return this.kmRate;
  }

  public getTariff() {
    return this.tariff;
  }

  public getDistance(unit: string) {
    this.distanceUnit = unit;
    return this.distance.printIn(unit);
  }

  public getProposedDrivers() {
    return this.proposedDrivers;
  }

  public setProposedDrivers(proposedDrivers: DriverDto[]) {
    this.proposedDrivers = proposedDrivers;
  }

  public getClaimDTO() {
    return this.claimDto;
  }

  public setClaimDTO(claimDto: ClaimDto) {
    this.claimDto = claimDto;
  }

  public getTo() {
    return this.to;
  }

  public setTo(to: AddressDto) {
    this.to = to;
  }

  public getFrom() {
    return this.from;
  }

  public setFrom(from: AddressDto) {
    this.from = from;
  }

  public getCarClass() {
    return this.carClass;
  }

  public setCarClass(carClass: CarClass) {
    this.carClass = carClass;
  }

  public getClientDto() {
    return this.clientDto;
  }

  public setClientDTO(clientDto: ClientDto) {
    this.clientDto = clientDto;
  }

  public getId() {
    return this.id;
  }

  public getStatus() {
    return this.status;
  }

  public setStatus(status: Status) {
    this.status = status;
  }

  public getPrice() {
    return this.price;
  }

  public getDriverFee() {
    return this.driverFee;
  }

  public setDriverFee(driverFee: number) {
    this.driverFee = driverFee;
  }

  public getDateTime() {
    return this.dateTime;
  }

  public setDateTime(dateTime: number) {
    this.dateTime = dateTime;
  }

  public getPublished() {
    return this.published;
  }

  public setPublished(published: number) {
    this.published = published;
  }

  public getAcceptedAt() {
    return this.acceptedAt;
  }

  public setAcceptedAt(acceptedAt: number) {
    this.acceptedAt = acceptedAt;
  }

  public getStarted() {
    return this.started;
  }

  public setStarted(started: number) {
    this.started = started;
  }

  public getCompleteAt() {
    return this.completeAt;
  }

  public setCompleteAt(completeAt: number) {
    this.completeAt = completeAt;
  }

  public getEstimatedPrice() {
    return this.estimatedPrice;
  }

  public setEstimatedPrice(estimatedPrice: number) {
    this.estimatedPrice = estimatedPrice;
  }
}
