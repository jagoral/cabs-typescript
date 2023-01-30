import { Driver } from 'src/entity/driver.entity';
import { Address } from 'src/entity/address.entity';
import { Client } from 'src/entity/client.entity';

type TransitAddress = Record<'from' | 'to', Address>;

export interface TransitOverrides {
  address?: Partial<TransitAddress>;
  client?: Client;
}

export interface CompletedTransitOverrides extends TransitOverrides {
  driver?: Driver;
}
