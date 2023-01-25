import { CarTypeDto } from 'src/dto/car-type.dto';
import { CreateCarTypeDto } from 'src/dto/create-car-type.dto';
import { CarClass } from 'src/entity/car-type.entity';
import { CarTypeService } from 'src/service/car-type.service';
import { createTestApp } from 'test/setup/test-server';

describe('Car Type Update', () => {
  let carTypeService: CarTypeService;

  beforeAll(async () => {
    const app = await createTestApp();
    carTypeService = app.get(CarTypeService);
  });

  it('should create car type', async () => {
    //given
    await thereIsNoCarClassInTheSystem(CarClass.VAN);

    //when
    const created = await createCarClass('duze i dobre', CarClass.VAN);

    //then
    expect(created).toMatchObject({
      carClass: CarClass.VAN,
      description: 'duze i dobre',
      carsCounter: 0,
      activeCarsCounter: 0,
    });
  });

  it('should change car description', async () => {
    //given
    await thereIsNoCarClassInTheSystem(CarClass.VAN);
    //and
    await createCarClass('duze i dobre', CarClass.VAN);

    //when
    const changed = await createCarClass('duze i bardzo dobre', CarClass.VAN);

    //then
    expect(changed).toMatchObject({
      carClass: CarClass.VAN,
      description: 'duze i bardzo dobre',
      carsCounter: 0,
    });
  });

  it('should register active cars', async () => {
    //given
    const created = await createCarClass('duze i dobre', CarClass.VAN);

    //when
    await registerActiveCar(CarClass.VAN);

    //then
    const loaded = await load(created.id);
    expect(loaded.activeCarsCounter).toEqual(created.activeCarsCounter + 1);
  });

  it('should unregister active cars', async () => {
    //given
    const created = await createCarClass('duze i dobre', CarClass.VAN);

    //when
    await unregisterActiveCar(CarClass.VAN);

    //then
    const loaded = await load(created.id);
    expect(loaded.activeCarsCounter).toEqual(created.activeCarsCounter - 1);
  });

  async function registerActiveCar(carClass: CarClass): Promise<void> {
    return carTypeService.registerActiveCar(carClass);
  }

  async function unregisterActiveCar(carClass: CarClass): Promise<void> {
    return carTypeService.unregisterActiveCar(carClass);
  }

  async function thereIsNoCarClassInTheSystem(
    carClass: CarClass,
  ): Promise<void> {
    return carTypeService.removeCarType(carClass);
  }

  async function load(id: string): Promise<CarTypeDto> {
    return carTypeService.loadDto(id);
  }

  async function createCarClass(
    description: string,
    carClass: CarClass,
  ): Promise<CarTypeDto> {
    const carTypeDto = new CreateCarTypeDto();
    carTypeDto.description = description;
    carTypeDto.carClass = carClass;
    const created = await carTypeService.create(carTypeDto);
    return load(created.getId());
  }
});
