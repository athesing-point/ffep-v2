import { configureStore } from '@reduxjs/toolkit';
import { smartyStreetsApi } from 'services/api/smartyStreetsApi';

const store = configureStore({
  reducer: {
    [smartyStreetsApi.reducerPath]: smartyStreetsApi.reducer,
  },
  middleware: (getDefaultMiddleware) => {
    return getDefaultMiddleware().concat([smartyStreetsApi.middleware]);
  },
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;

export default store;
