import * as React from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { StyleSheetManager, ThemeProvider } from 'styled-components';
import { defaultTheme } from '@pointdotcom/pds';
import { shouldForwardProp } from 'styleHelpers';
import store from '../store';

interface BaseProvidersProps {
  children?: React.ReactNode;
}

export default function BaseProviders({ children }: BaseProvidersProps): JSX.Element {
  return (
    <ReduxProvider store={store}>
      <StyleSheetManager shouldForwardProp={shouldForwardProp}>
        <ThemeProvider theme={defaultTheme}>{children}</ThemeProvider>
      </StyleSheetManager>
    </ReduxProvider>
  );
}
