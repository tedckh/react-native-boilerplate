import { ApiCore } from './api';
import QueryString from 'qs';

type ApiConfig = {
  baseUrl: string;
  timeout: number;
  headers?: Record<string, string>;
};

export function setApiConfig(apiConfig: ApiConfig) {
  ApiCore.primary.setConfig({
    ...apiConfig,
    paramsSerializer: (params) =>
      QueryString.stringify(params, {
        arrayFormat: 'repeat',
      }),
  });

  return ApiCore.primary;
}
