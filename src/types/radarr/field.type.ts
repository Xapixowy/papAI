import { PrivacyLevel } from '@Enums/radarr/movie';
import { SelectOption } from './select-option.type';

export type Field = {
  order: number;
  name: string | null;
  label: string | null;
  unit: string | null;
  helpText: string | null;
  helpTextWarning: string | null;
  helpLink: string | null;
  value: object | null;
  type: string | null;
  advanced: boolean;
  selectOptions: SelectOption[] | null;
  selectOptionsProviderAction: string | null;
  section: string | null;
  hidden: string | null;
  privacy: PrivacyLevel;
  placeholder: string | null;
  isFloat: boolean;
};
