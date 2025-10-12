import { Field } from './field.type';

export type CustomFormatSpecification = {
  id: number;
  name: string | null;
  implementation: string | null;
  implementationName: string | null;
  infoLink: string | null;
  negate: boolean;
  required: boolean;
  fields: Field[] | null;
  presets: object | null;
};
