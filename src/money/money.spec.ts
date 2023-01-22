import { Money } from './money';

describe('Money', () => {
  it.each([
    { value: 10000, expected: '100.00' },
    { value: 0, expected: '0.00' },
    { value: 1012, expected: '10.12' },
  ])(
    'should create "$expected" money for value $value',
    ({ value, expected }) =>
      expect(new Money(value).toString()).toEqual(expected),
  );

  it.each([{ value: 10 }, { value: 0 }, { value: -5 }])(
    'should project money from value $value to integer',
    ({ value }) => expect(new Money(value).toInt()).toEqual(value),
  );

  it.each([
    { value: 500, other: 500 },
    { value: 1020, other: 22 },
    { value: 0, other: 0 },
    { value: -2, other: -4 },
  ])('should add $other to $value', ({ value, other }) =>
    expect(
      new Money(value).add(new Money(other)).equals(new Money(value + other)),
    ).toBeTruthy(),
  );

  it.each([
    { value: 50, other: 50 },
    { value: 1020, other: 22 },
    { value: 2, other: 3 },
  ])('should substract $other from $value', ({ value, other }) =>
    expect(
      new Money(value)
        .subtract(new Money(other))
        .equals(new Money(value - other)),
    ).toBeTruthy(),
  );

  it.each([
    { value: 10000, percentage: 30, expected: '30.00' },
    { value: 8800, percentage: 30, expected: '26.40' },
    { value: 8800, percentage: 100, expected: '88.00' },
    { value: 8800, percentage: 0, expected: '0.00' },
    { value: 4400, percentage: 30, expected: '13.20' },
    { value: 100, percentage: 30, expected: '0.30' },
    { value: 1, percentage: 40, expected: '0.00' },
  ])('should substract $other from $value', ({ value, percentage, expected }) =>
    expect(new Money(value).percentage(percentage).toString()).toEqual(
      expected,
    ),
  );
});
