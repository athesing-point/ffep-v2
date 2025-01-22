import * as React from 'react';
import { useCallback, useImperativeHandle, useState } from 'react';
import SmartyStreetsAutocomplete from 'components/SmartyStreetsAutocomplete';
import i18n from './i18n';

export enum AddressWidgetError {
  MissingValue,
}
export interface AddressWidgetImperatives {
  setError: (errorType: null | AddressWidgetError) => void;
}

export interface AddressWidgetProps {
  onChange?: (newAddress: string) => unknown;
  onSelect?: (newAddress: string) => unknown;
  onSubmit?: () => unknown;
  placeholder: string;
  messages?: {
    missingValueMessage?: string;
  };
  imperativeRef?: React.RefObject<AddressWidgetImperatives>;
}

export default function AddressWidget({
  onChange,
  onSelect,
  placeholder,
  onSubmit,
  messages: { missingValueMessage = i18n.thisField } = {},
  imperativeRef,
}: AddressWidgetProps): JSX.Element {
  const handleChange = useCallback(
    (_: unknown, { value: newAddress }: TSFixMe) => {
      onChange?.(newAddress);

      // To make TypeScript happy...
      return null;
    },
    [onChange]
  );
  const handleSelect = useCallback(
    ({ value: newAddress }: TSFixMe) => {
      onSelect?.(newAddress);
      return null;
    },
    [onSelect]
  );

  const handleSubmit = useCallback(() => {
    onSubmit?.();
    return null;
  }, [onSubmit]);

  const [error, setError] = useState<null | AddressWidgetError>();

  useImperativeHandle(
    imperativeRef,
    () => ({
      setError,
    }),
    []
  );

  const errorMessage: null | string = (() => {
    switch (error) {
      case AddressWidgetError.MissingValue:
        return missingValueMessage;
      default:
        return null;
    }
  })();

  return (
    <SmartyStreetsAutocomplete
      helptext={errorMessage ?? undefined}
      error={error != null}
      inputProps={{}}
      onSelect={handleSelect}
      onChange={handleChange}
      onSubmit={handleSubmit}
      placeholder={placeholder}
    />
  );
}
