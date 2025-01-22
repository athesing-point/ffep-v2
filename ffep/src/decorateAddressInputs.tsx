import * as React from 'react';
import { createRoot } from 'react-dom/client';
import AddressWidget, { AddressWidgetProps } from './components/AddressWidget';
import BaseProviders from './components/BaseProviders';

interface DecorateAddressInputProps {
  onChange?: AddressWidgetProps['onChange'];
  onSelect?: AddressWidgetProps['onSelect'];
  imperativeRef?: AddressWidgetProps['imperativeRef'];
}

function decorateAddressInput(
  addressInput: HTMLInputElement,
  props: DecorateAddressInputProps
): void {
  const { placeholder } = addressInput;
  const missingValueMessage = addressInput.attributes.getNamedItem(
    'data-missing-value-message'
  )?.value;

  const newDiv = document.createElement('div');
  addressInput.replaceWith(newDiv);
  const root = createRoot(newDiv);

  root.render(
    <BaseProviders>
      <AddressWidget {...props} placeholder={placeholder} messages={{ missingValueMessage }} />
    </BaseProviders>
  );
}

export default function decorateAddressInputs(
  parentNode: ParentNode,
  props: DecorateAddressInputProps
) {
  const addressInputs = Array.from(parentNode.querySelectorAll('input[data-ffep="address"]'));

  addressInputs.forEach((addressInput) => {
    decorateAddressInput(addressInput as HTMLInputElement, props);
  });
}
