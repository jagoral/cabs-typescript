export class Money {
  public static readonly ZERO = new Money(0);

  constructor(private readonly value: number) {}

  public add(other: Money): Money {
    return new Money(this.value + other.value);
  }

  public subtract(other: Money): Money {
    return new Money(this.value - other.value);
  }

  public percentage(percentage: number): Money {
    return new Money(+((this.value * percentage) / 100).toFixed());
  }

  public toInt(): number {
    return this.value;
  }

  public toString(): string {
    return (this.value / 100).toFixed(2);
  }

  public equals(other: Money) {
    return this.value === other.value;
  }
}
