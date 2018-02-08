import Big from 'big.js';
import _ from 'lodash';
import {
  GRAM,
  OUNCE,
  POUND,
  MILLIGRAM,
  KILOGRAM,
  UNIT,
  UNIT_NAMES,
} from './unit';
import {
  ABBREVIATIONS,
  ABBREVIATION_ALIASES,
} from './abbreviations';

const GRAMS_PER_OUNCE     = new Big('28.34952');
const GRAMS_PER_POUND     = new Big('453.59237');
const OUNCES_PER_POUND    = new Big('16');
const MILLIGRAMS_PER_GRAM = new Big('1000');
const KILOGRAMS_PER_GRAM  = new Big('0.001');
const IDENTITY            = new Big('1');

const MILLIGRAMS_PER_OUNCE    = GRAMS_PER_OUNCE.times(MILLIGRAMS_PER_GRAM);
const KILOGRAMS_PER_OUNCE     = GRAMS_PER_OUNCE.times(KILOGRAMS_PER_GRAM);
const MILLIGRAMS_PER_POUND    = GRAMS_PER_POUND.times(MILLIGRAMS_PER_GRAM);
const KILOGRAMS_PER_POUND     = GRAMS_PER_POUND.times(KILOGRAMS_PER_GRAM);
const KILOGRAMS_PER_MILLIGRAM = MILLIGRAMS_PER_GRAM.pow(2);

const CONVERSIONS = {};
CONVERSIONS[UNIT] = {};
CONVERSIONS[UNIT][UNIT] = ['times', IDENTITY];
CONVERSIONS[GRAM] = {};
CONVERSIONS[GRAM][GRAM] = ['times', IDENTITY];
CONVERSIONS[GRAM][OUNCE] = ['div', GRAMS_PER_OUNCE];
CONVERSIONS[GRAM][POUND] = ['div', GRAMS_PER_POUND];
CONVERSIONS[GRAM][MILLIGRAM] = ['times', MILLIGRAMS_PER_GRAM];
CONVERSIONS[GRAM][KILOGRAM] = ['times', KILOGRAMS_PER_GRAM];
CONVERSIONS[OUNCE] = {};
CONVERSIONS[OUNCE][GRAM] = ['times', GRAMS_PER_OUNCE];
CONVERSIONS[OUNCE][OUNCE] = ['times', IDENTITY];
CONVERSIONS[OUNCE][POUND] = ['div', OUNCES_PER_POUND];
CONVERSIONS[OUNCE][MILLIGRAM] = ['times', MILLIGRAMS_PER_OUNCE];
CONVERSIONS[OUNCE][KILOGRAM] = ['times', KILOGRAMS_PER_OUNCE];
CONVERSIONS[POUND] = {};
CONVERSIONS[POUND][GRAM] = ['times', GRAMS_PER_POUND];
CONVERSIONS[POUND][OUNCE] = ['times', OUNCES_PER_POUND];
CONVERSIONS[POUND][POUND] = ['times', IDENTITY];
CONVERSIONS[POUND][MILLIGRAM] = ['times', MILLIGRAMS_PER_POUND];
CONVERSIONS[POUND][KILOGRAM] = ['times', KILOGRAMS_PER_POUND];
CONVERSIONS[MILLIGRAM] = {};
CONVERSIONS[MILLIGRAM][GRAM] = ['div', MILLIGRAMS_PER_GRAM];
CONVERSIONS[MILLIGRAM][OUNCE] = ['div', MILLIGRAMS_PER_OUNCE];
CONVERSIONS[MILLIGRAM][POUND] = ['div', MILLIGRAMS_PER_POUND];
CONVERSIONS[MILLIGRAM][MILLIGRAM] = ['times', IDENTITY];
CONVERSIONS[MILLIGRAM][KILOGRAM] = ['div', KILOGRAMS_PER_MILLIGRAM];
CONVERSIONS[KILOGRAM] = {};
CONVERSIONS[KILOGRAM][GRAM] = ['div', KILOGRAMS_PER_GRAM];
CONVERSIONS[KILOGRAM][OUNCE] = ['div', KILOGRAMS_PER_OUNCE];
CONVERSIONS[KILOGRAM][POUND] = ['div', KILOGRAMS_PER_POUND];
CONVERSIONS[KILOGRAM][MILLIGRAM] = ['times', KILOGRAMS_PER_MILLIGRAM];
CONVERSIONS[KILOGRAM][KILOGRAM] = ['times', IDENTITY];

function isWeight(object) {
  return object.constructor.name === 'Weight';
}

export default class Weight {
  static parse(string) {
    if (typeof string !== 'string') {
      throw 'Invalid argument: String expected';
    }

    const parts = _.trim(string).split(' ');

    const value = parts[0];
    const abbreviation = parts[1];

    let unit;

    if (_.isUndefined(abbreviation) || _.isNull(abbreviation)) {
      unit = UNIT;
    } else {
      unit = ABBREVIATION_ALIASES[abbreviation.toLowerCase()];
    }

    if (_.isUndefined(value) ||_.isUndefined(unit)) {
      throw 'Invalid weight';
    }

    return new Weight(value, unit);
  }

  constructor(value, unit) {
    this.value = new Big(value);
    this.unit = unit;
  }

  get unitAbbreviation() {
    return ABBREVIATIONS[this.unit];
  }

  toString() {
    return _.trim(`${this.value} ${this.unitAbbreviation}`);
  }

  toJSON() {
    return {
      value: this.value.toJSON(),
      unit: this.unit,
    };
  }

  isZero() {
    return this.value.eq(new Big(0));
  }

  to(unit) {
    const conversion = CONVERSIONS[this.unit][unit];

    if (_.isUndefined(conversion)) {
      const fromUnit = UNIT_NAMES[this.unit];
      const toUnit = UNIT_NAMES[unit];
      throw `No conversion from ${fromUnit} to ${toUnit}`;
    }

    const operator = conversion[0];
    const conversionValue = conversion[1];
    const newValue = this.value[operator](conversionValue);

    return new Weight(newValue, unit);
  }

  plus(other) {
    const otherConverted = other.to(this.unit);
    const newValue = this.value.plus(otherConverted.value);
    return new Weight(newValue, this.unit);
  }

  minus(other) {
    const otherConverted = other.to(this.unit);
    const newValue = this.value.minus(otherConverted.value);
    return new Weight(newValue, this.unit);
  }

  times(other) {
    let otherValue = other;

    if (isWeight(other)) {
      if (other.unit === UNIT) {
        otherValue = other.value;
      } else {
        otherValue = other.to(this.unit).value;
      }
    }

    const newValue = this.value.times(otherValue);
    return new Weight(newValue, this.unit);
  }

  div(other) {
    if (!isWeight(other) || (other.unit === UNIT && other.unit != this.unit)) {
      const otherValue = isWeight(other) ? other.value : other;
      const newValue = this.value.div(otherValue);
      return new Weight(newValue, this.unit);
    }

    const otherConverted = other.to(this.unit);
    return this.value.div(otherConverted.value);
  }

  round(precision = 0) {
    return new Weight(this.value.round(precision), this.unit);
  }

  lt(other) {
    return this.value.lt(other.to(this.unit).value);
  }

  lte(other) {
    return this.value.lte(other.to(this.unit).value);
  }

  gt(other) {
    return this.value.gt(other.to(this.unit).value);
  }

  gte(other) {
    return this.value.gte(other.to(this.unit).value);
  }

  cmp(other) {
    return this.value.cmp(other.to(this.unit).value);
  }

  eq(other) {
    return this.value.eq(other.to(this.unit).value);
  }
}