import { NotAcceptableException } from '@nestjs/common';
import { DriverLicense } from './driver-license';

describe('DriverLicense', () => {
  it('should not create invalid license', () => {
    expect(() => DriverLicense.withLicense('invalidLicense')).toThrow(
      NotAcceptableException,
    );
  });

  it('should create valid license', () => {
    //when
    const driverLicense = DriverLicense.withLicense('FARME100165AB5EW');

    //then
    expect(driverLicense.asString()).toEqual('FARME100165AB5EW');
  });

  it('should create invalid license explicitly', () => {
    //when
    const driverLicense = DriverLicense.withoutValidation('invalid');

    //then
    expect(driverLicense.asString()).toEqual('invalid');
  });
});
