import { PostHog } from 'posthog-js';
import { FlexibleFormParams } from 'components/FlexibleFormEntrypoint/flexibleFormParams';
import { AddressWidgetError, AddressWidgetImperatives } from './components/AddressWidget';
import decorateAddressInputs from './decorateAddressInputs';

interface DecorateFormElementProps {
  onSubmit?: (address: string) => unknown;
}

function decorateFormElement(formElement: HTMLFormElement, props: DecorateFormElementProps = {}) {
  const ffepTarget = process.env.REACT_APP_FFEP_TARGET;
  if (ffepTarget == null) {
    console.error('No FFEP target set');
    return;
  }

  const newForm = document.createElement('form');
  Array.from(formElement.attributes).forEach((attribute) => {
    if (attribute.nodeValue != null) {
      newForm.setAttribute(attribute.nodeName, attribute.nodeValue);
    }
  });
  Array.from(formElement.childNodes).forEach((childNode) => {
    newForm.appendChild(childNode);
  });
  newForm.setAttribute('action', ffepTarget);
  formElement.replaceWith(newForm);

  let currentAddress = '';

  const addressWidgetImperativesRef: React.RefObject<AddressWidgetImperatives> = { current: null };

  const handleAddressChange = (newAddress: string) => {
    currentAddress = newAddress;
    addressWidgetImperativesRef.current?.setError(null);
  };
  const handleAddressSelect = (newAddress: string) => {
    currentAddress = newAddress;
    addressWidgetImperativesRef.current?.setError(null);

    const autoSubmitDisabled =
      (window as Window & { posthog?: PostHog }).posthog?.isFeatureEnabled(
        'cr25-ffep-auto-submit-disabled'
      ) ?? false;
    if (typeof newForm.requestSubmit === 'function' && !autoSubmitDisabled) {
      // (`requestSubmit` is not available in some older but still targeted browsers)
      newForm.requestSubmit();
    }
  };

  newForm.addEventListener('formdata', (e) => {
    const flexibleFormValues: FlexibleFormParams = {
      address: currentAddress,
    };

    const { formData } = e;
    Object.entries(flexibleFormValues).forEach(([key, value]) => {
      formData.set(key, value);
    });
  });
  newForm.addEventListener('submit', (e) => {
    e.stopImmediatePropagation();

    if (currentAddress.trim() === '') {
      e.preventDefault();
      addressWidgetImperativesRef.current?.setError(AddressWidgetError.MissingValue);
      return;
    }

    props.onSubmit?.(currentAddress);
  });

  decorateAddressInputs(newForm, {
    onChange: handleAddressChange,
    onSelect: handleAddressSelect,
    imperativeRef: addressWidgetImperativesRef,
  });
}

export default function decorateFormElements(
  parentNode: ParentNode,
  props?: DecorateFormElementProps
) {
  const formElements = Array.from(
    parentNode.querySelectorAll<HTMLFormElement>('form[data-ffep="form"]')
  );
  formElements.forEach((formElement) => {
    decorateFormElement(formElement, props);
  });
}
