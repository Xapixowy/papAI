import { CustomFormatSpecification } from './custom-format-specification.type';

export type CustomFormat = {
  id: number;
  name: string | null;
  includeCustomFormatWhenRenaming: boolean | null;
  specifications: CustomFormatSpecification[] | null;
};
