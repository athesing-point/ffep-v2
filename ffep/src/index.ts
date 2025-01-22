import bugsnagClient from 'lib/bugsnagClient';
import decorateFormElements from './decorateFormElements';

interface FfepWindow {
  onSubmitFfepForm?: unknown;
}
const ffepWindow = window as FfepWindow;

// use mock server for development
async function enableMocking(): Promise<void> {
  if (process.env.NODE_ENV === 'development' && process.env.REACT_APP_USE_MOCK_SERVER === 'true') {
    const { mockUploads, worker, unhandledRequestHandler } = await import('mocks/browser');

    // `worker.start()` returns a Promise that resolves
    // once the Service Worker is up and ready to intercept requests.
    await worker.start({ onUnhandledRequest: unhandledRequestHandler });
    mockUploads();
  }
}

async function handleDocumentLoad() {
  await enableMocking();

  decorateFormElements(document, {
    onSubmit: (address) => {
      const { onSubmitFfepForm } = ffepWindow;
      if (typeof onSubmitFfepForm === 'function') {
        try {
          onSubmitFfepForm(address);
        } catch (error: unknown) {
          // Suppress any errors from this callback
          if (error instanceof Error) {
            bugsnagClient.notify(error);
          }
          console.error(error);
        }
      }
    },
  });
}

if (document.readyState === 'complete') {
  handleDocumentLoad();
} else {
  window.addEventListener('load', handleDocumentLoad);
}
