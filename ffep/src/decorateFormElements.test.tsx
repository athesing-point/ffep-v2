import * as React from 'react';
import nullthrows from 'nullthrows';
import { createRoot } from 'react-dom/client';
import { act, screen, userEvent } from 'testHelpers';
import decorateFormElements from './decorateFormElements';

// CE-2043: Skipping due to flakiness of this test suite. An intermittent error is raised after running the test suite completes in a full CI run.
describe.skip('decorateFormElements', () => {
  beforeAll(() => {
    process.env.REACT_APP_FFEP_TARGET = 'http://localhost:8888';
  });

  let originalHTMLFormElementRequestSubmit: HTMLFormElement['requestSubmit'] | null = null;

  let onFinalSubmit: null | ((form: HTMLFormElement, formData: FormData) => unknown) = null;

  beforeEach(() => {
    originalHTMLFormElementRequestSubmit = HTMLFormElement.prototype.requestSubmit;
    HTMLFormElement.prototype.requestSubmit = function mockRequestSubmit(
      submitter?: HTMLElement | null | undefined
    ): void {
      const submitEvent = new Event('submit', {
        bubbles: true,
        cancelable: true,
      }) as SubmitEvent & { submitter: HTMLElement | null };
      submitEvent.submitter = submitter ?? null;
      this.dispatchEvent(submitEvent);
      if (submitEvent.defaultPrevented) {
        return;
      }

      const formData = new FormData();
      Array.from(this.getElementsByTagName('input')).forEach((inputElement) => {
        if (inputElement.name) {
          formData.set(inputElement.name, inputElement.value);
        }
      });
      const formDataEvent = new Event('formdata', {
        bubbles: true,
        cancelable: true,
      }) as FormDataEvent & { formData: FormData };
      formDataEvent.formData = formData;
      this.dispatchEvent(formDataEvent);
      onFinalSubmit?.(this, formData);
    };
  });
  afterEach(() => {
    HTMLFormElement.prototype.requestSubmit = nullthrows(originalHTMLFormElementRequestSubmit);
    onFinalSubmit = null;
  });

  const submitButtonRef: React.RefObject<HTMLButtonElement> = { current: null };
  let container: HTMLDivElement | null = null;

  beforeEach(async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <form data-ffep="form">
          <input data-ffep="address" name="addressinput" placeholder="Your address" />
          <button ref={submitButtonRef} type="submit">
            Submit
          </button>
        </form>
      );
    });
  });
  afterEach(() => {
    document.body.removeChild(nullthrows(container));
  });

  it('decorates FFEP form elements', async () => {
    await act(async () => {
      decorateFormElements(document);
    });

    const input = screen.getByRole('combobox', {
      name: /Your address/i,
    });
    expect(input).toBeInTheDocument();
  });

  it('submits an address ', async () => {
    await act(async () => {
      decorateFormElements(document);
    });

    const submitButton = nullthrows(submitButtonRef.current);
    const form = submitButtonRef.current?.form;
    expect(form).not.toBeNull();

    const input = screen.getByRole('combobox', {
      name: /Your address/i,
    });
    await userEvent.type(input, '2626 ohio, redwood, ca 94061');

    let submittedFormData: null | FormData = null;
    const submittedPromise = new Promise<FormData>((resolve) => {
      onFinalSubmit = (_, formData) => {
        resolve(formData);
      };
    });
    form?.requestSubmit(submitButton);
    submittedFormData = await submittedPromise;

    expect(submittedFormData.get('address')).toEqual('2626 ohio, redwood, ca 94061');
  });
});
