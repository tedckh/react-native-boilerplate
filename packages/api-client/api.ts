/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  ApiErrorResponse,
  ApiResponse,
  ApisauceConfig,
  ApisauceInstance,
  create,
  TIMEOUT_ERROR,
} from 'apisauce';
import Axios, { AxiosRequestConfig } from 'axios';
import { ApiProblem, ApiProblemKind, getApiProblem } from './api-problem';
import { ApiError } from './api-error';

const DEFAULT_TIMEOUT = 8000;

export type ApiConfig = {
  baseUrl?: string;
  timeout?: number;
} & Omit<AxiosRequestConfig, 'baseURL' | 'timeout' | 'url'>;

type ApiOptions<T> = {
  config?: AxiosRequestConfig<T> & {
    skipDefaultErrorHandler?: boolean;
    customErrorHandler?: (err: unknown) => void;
  };
};

export type UnauthorizedHandleOptions =
  | {
      handler: (
        url: string | undefined,
        config: AxiosRequestConfig,
      ) => Promise<string | null>;
      delayTimeout?: boolean;
    }
  | undefined;

/**
 * Wrapper for ApiSauce and Axios.
 * Wrap this by api classes.
 * Should not be used directly in application code.
 */
export class ApiCore {
  private static _default: ApiCore;
  private static _primary: ApiCore;

  /**
   * Default API singleton
   */
  public static get default() {
    if (ApiCore._default == null) ApiCore._default = new ApiCore();
    return ApiCore._default;
  }

  /**
   * Primary API singleton
   */
  public static get primary() {
    if (ApiCore._primary == null) ApiCore._primary = new ApiCore();
    return ApiCore._primary;
  }

  /**
   *
   * @param apiConfig.baseUrl Base url of all API Calls for the `Api.primary` instance
   * @param apiConfig.timeout Timeout in ms for API calls
   * @param apiConfig         Any other AxiosRequestConfig are accepted
   */
  public static setConfig(apiConfig?: ApiConfig) {
    ApiCore.default.setConfig({ ...apiConfig, baseUrl: undefined });
    ApiCore.primary.setConfig(apiConfig);
  }

  public verbose = false;

  private apisauce!: ApisauceInstance;

  private config?: ApiConfig;

  private authorizationHeader?: string;

  private onUnauthorized?: {
    handler: (
      url: string | undefined,
      config: AxiosRequestConfig,
    ) => Promise<string | null>;
    delayTimeout?: boolean;
  };

  private unauthorizeHandlingPromise: Promise<string | null> | undefined;

  private defaultApiErrorHandler?: (err: unknown) => void;

  /**
   * Create a new API instance.
   *
   * In most cases, you should not need to construct the API instance yourself.
   * Use the singleton object  `Api.default` or `Api.primary`
   */
  public constructor() {
    this.setConfig();
  }

  // make timeout working on Android:
  // https://github.com/infinitered/apisauce/issues/163#issuecomment-441475858
  private requestTimeout = <T, U = T>(
    promise: Promise<ApiResponse<T, U>>,
    axiosConfig: AxiosRequestConfig,
    reqConfig: [string, {}?, AxiosRequestConfig?],
  ): Promise<ApiResponse<T, U>> => {
    const config = { ...axiosConfig, ...(reqConfig[2] || {}) };

    const duration = config.timeout || this.config?.timeout || DEFAULT_TIMEOUT;
    let timeout: number | undefined;

    const timeoutPromise = new Promise<ApiErrorResponse<U>>((resolve) => {
      timeout = setInterval(() => {
        if (
          this.onUnauthorized?.delayTimeout &&
          this.unauthorizeHandlingPromise != null
        )
          return;
        if (timeout != null) clearInterval(timeout);
        timeout = undefined;

        resolve({
          ok: false,
          problem: TIMEOUT_ERROR,
          originalError: {
            config,
            isAxiosError: false,
          },
          data: undefined,
          status: undefined,
          headers: undefined,
          config,
          duration,
        } as ApiErrorResponse<U>);
      }, duration);
    });

    return Promise.race([timeoutPromise, promise]).then((res) => {
      if (timeout != null) clearInterval(timeout);

      if (this.verbose && res.problem === TIMEOUT_ERROR) {
        console.warn({
          name: 'API Timeout',
          important: true,
          preview: `${reqConfig[0]} (${duration} ms)`,
          value: [res, reqConfig],
        });
      }
      return res;
    });
  };

  /**
   * Set HTTP Authorization header field for subsequent request of this instance
   *
   * @param authHeader Usually the Bearer token: include the leading `Bearer` in the parameter. Set to `null` to unset the token
   * @returns The Api instance, for chaining
   */
  public setAuthorizationHeader(authHeader: string | null): ApiCore {
    if (this === ApiCore._default) {
      console.warn(
        'Do not set Authorization header for Api.default instance. Use Api.primary instead.',
      );
      return this;
    }
    this.authorizationHeader = authHeader ?? undefined;
    return this;
  }

  /**
   * Set a custom handler on API response 401 for refreshing the identity
   * The handler should return a new Authorization header value, or null to indicates unavailable of refreshed identity
   * If the handler returns an Authorization header value, failed request will be retried with the refreshed identity
   * When not Authorization header value returned, or the request still returns 401 with the refreshed identity, the original promise will thrown Error
   *
   * @param opts.handler      The handler on unauthorized request
   * @param opts.delayTimeout Option to delay general API timeout during handler in process
   * @returns The Api instance, for chaining
   */
  public setUnauthorizedHandle(opts: UnauthorizedHandleOptions): ApiCore {
    this.onUnauthorized =
      opts == null
        ? undefined
        : { handler: opts.handler, delayTimeout: opts.delayTimeout };
    return this;
  }

  /**
   * Set Default Api Error handler
   *
   * @param handler Function to handle errors globally. Can be overwritten.
   * @returns The ApiCore instance, for chaining
   */
  public setDefaultApiErrorHandler(handler: (err: unknown) => void): this {
    this.defaultApiErrorHandler = handler;
    return this;
  }

  public setConfig(apiConfig?: ApiConfig) {
    const isDefault = this === ApiCore._default;

    if (isDefault && apiConfig?.baseUrl != null) {
      console.warn(
        'Api.default base url should not be altered. Ignore base url in setConfig(). ',
      );
    }

    this.config = { ...this.config, ...apiConfig };

    const api = create({
      ...this.config,
      baseURL: !isDefault ? this.config?.baseUrl : undefined,
      timeout: this.config?.timeout,
      headers: {
        Accept: 'application/json',
        ...this.config?.headers,
      },
    } as ApisauceConfig);

    const {
      axiosInstance: { defaults },
      get,
      delete: del,
      head,
      post,
      put,
      patch,
      link,
      unlink,
    } = api;

    api.get = (...args) =>
      this.requestTimeout(
        get(...args),
        defaults as AxiosRequestConfig,
        args as [string, {}?, AxiosRequestConfig?],
      );
    api.delete = (...args) =>
      this.requestTimeout(
        del(...args),
        defaults as AxiosRequestConfig,
        args as [string, {}?, AxiosRequestConfig?],
      );
    api.head = (...args) =>
      this.requestTimeout(
        head(...args),
        defaults as AxiosRequestConfig,
        args as [string, {}?, AxiosRequestConfig?],
      );
    api.post = (...args) =>
      this.requestTimeout(
        post(...args),
        defaults as AxiosRequestConfig,
        args as [string, {}?, AxiosRequestConfig?],
      );
    api.put = (...args) =>
      this.requestTimeout(
        put(...args),
        defaults as AxiosRequestConfig,
        args as [string, {}?, AxiosRequestConfig?],
      );
    api.patch = (...args) =>
      this.requestTimeout(
        patch(...args),
        defaults as AxiosRequestConfig,
        args as [string, {}?, AxiosRequestConfig?],
      );
    api.link = (...args) =>
      this.requestTimeout(
        link(...args),
        defaults as AxiosRequestConfig,
        args as [string, {}?, AxiosRequestConfig?],
      );
    api.unlink = (...args) =>
      this.requestTimeout(
        unlink(...args),
        defaults as AxiosRequestConfig,
        args as [string, {}?, AxiosRequestConfig?],
      );

    api.axiosInstance.interceptors.response.use(
      this.responseSuccessInterceptor,
      this.responseErrorInterceptor,
    );

    this.apisauce = api;

    return this;
  }

  private responseSuccessInterceptor = async (value: any) => value;

  private responseErrorInterceptor = async (error: {
    response: { status: number };
    config: AxiosRequestConfig;
  }): Promise<any> => {
    if (
      error.response.status == null ||
      error.response.status !== 401 ||
      this.onUnauthorized == null
    )
      return Promise.reject(error);

    const originalRequest = error.config;

    // @ts-ignore
    // reject the request if it is still failing in retry
    if (originalRequest.isRetry) return Promise.reject(error);

    let refreshedAuthorizationHeader: string | null;
    try {
      if (this.unauthorizeHandlingPromise == null) {
        this.unauthorizeHandlingPromise = this.onUnauthorized.handler(
          error.config.url,
          error.config,
        );
      }
      refreshedAuthorizationHeader = await this.unauthorizeHandlingPromise;
    } catch (err) {
      return await Promise.reject(error);
    } finally {
      this.unauthorizeHandlingPromise = undefined;
    }

    if (refreshedAuthorizationHeader == null) {
      return Promise.reject(error);
    }

    this.setAuthorizationHeader(refreshedAuthorizationHeader);

    // @ts-ignore
    originalRequest.isRetry = true;
    originalRequest.headers = {
      ...(originalRequest.headers as any),
      authorization: refreshedAuthorizationHeader,
    };

    return Axios(originalRequest);
  };

  private async plainApi<T>(
    apiPromise: Promise<ApiResponse<T>>,
    opts?: ApiOptions<T> & {
      config?: AxiosRequestConfig<T> & {
        skipDefaultErrorHandler?: boolean;
        customErrorHandler?: (err: unknown) => void;
      };
    },
  ): Promise<T | null> {
    let response: ApiResponse<T> | ApiProblem | null;

    const handleError = (error: unknown) => {
      const skip = opts?.config && (opts.config as any).skipDefaultErrorHandler;
      const customHandler =
        opts?.config && (opts.config as any).customErrorHandler;
      if (skip) {
        throw error;
      } else if (typeof customHandler === 'function') {
        customHandler(error);
      } else if (this.defaultApiErrorHandler) {
        this.defaultApiErrorHandler(error);
      } else {
        throw error;
      }
    };

    try {
      response = await apiPromise;
    } catch (err) {
      if (this.verbose) console.warn('Unknown API failure', err);
      handleError(
        new ApiError<T>(
          { kind: ApiProblemKind.Unknown },
          undefined,
          err as Error,
        ),
      );
      return null;
    }

    if (response == null || !response.ok) {
      const problem = getApiProblem(response);
      if (problem != null) {
        handleError(new ApiError<T>(problem, response));
        return null;
      }
    }

    return (response as ApiResponse<T>).data ?? null;
  }

  private transformConfig<T = any>(
    opts?: ApiOptions<T>,
  ): AxiosRequestConfig<T> | undefined {
    if (this.authorizationHeader == null || this.authorizationHeader === '')
      return opts?.config;
    return {
      ...opts?.config,
      headers: {
        ...(opts?.config?.headers as any),
        authorization: this.authorizationHeader,
      },
    };
  }

  /**
   * Fire a GET request to an endpoint
   *
   * @param endpoint    The Api endpoint. If the path is not a full URL, `apiCOnfig.baseUrl` will be prepended
   * @param opts.param  Query parameters to the API
   * @param opts.config Config for the API request. See AxiosRequestConfig for detail
   * @param T           Type of the API response
   * @returns           Promise of the API request as `T`, or `null` if the response is empty, or except thrown
   */
  public get<T = any>(
    endpoint: string,
    opts?: ApiOptions<T> & {
      param?: {};
    },
  ) {
    return this.plainApi<T>(
      this.apisauce.get(
        endpoint,
        opts?.param ?? {},
        this.transformConfig(opts) as any,
      ),
    );
  }

  /**
   * Fire a DELETE request to an endpoint
   *
   * @param endpoint    The Api endpoint. If the path is not a full URL, `apiCOnfig.baseUrl` will be prepended
   * @param opts.param  Query parameters to the API
   * @param opts.config Config for the API request. See AxiosRequestConfig for detail
   * @param T           Type of the API response
   * @returns           Promise of the API request as `T`, or `null` if the response is empty, or except thrown
   */
  public delete<T = any>(
    endpoint: string,
    opts?: ApiOptions<T> & {
      param?: {};
    },
  ) {
    return this.plainApi<T>(
      this.apisauce.delete(
        endpoint,
        opts?.param ?? {},
        this.transformConfig(opts) as any,
      ),
    );
  }

  /**
   * Fire a HEAD request to an endpoint
   *
   * @param endpoint    The Api endpoint. If the path is not a full URL, `apiCOnfig.baseUrl` will be prepended
   * @param opts.param  Query parameters to the API
   * @param opts.config Config for the API request. See AxiosRequestConfig for detail
   * @param T           Type of the API response
   * @returns           Promise of the API request as `T`, or `null` if the response is empty, or except thrown
   */
  public head<T = any>(
    endpoint: string,
    opts?: ApiOptions<T> & {
      param?: {};
    },
  ) {
    return this.plainApi<T>(
      this.apisauce.head(
        endpoint,
        opts?.param ?? {},
        this.transformConfig(opts) as any,
      ),
    );
  }

  /**
   * Fire a LINK request to an endpoint
   *
   * @param endpoint    The Api endpoint. If the path is not a full URL, `apiCOnfig.baseUrl` will be prepended
   * @param opts.param  Query parameters to the API
   * @param opts.config Config for the API request. See AxiosRequestConfig for detail
   * @param T           Type of the API response
   * @returns           Promise of the API request as `T`, or `null` if the response is empty, or except thrown
   */
  public link<T = any>(
    endpoint: string,
    opts?: ApiOptions<T> & {
      param?: {};
    },
  ) {
    return this.plainApi<T>(
      this.apisauce.link(
        endpoint,
        opts?.param ?? {},
        this.transformConfig(opts) as any,
      ),
      opts,
    );
  }

  /**
   * Fire a UNLINK request to an endpoint
   *
   * @param endpoint    The Api endpoint. If the path is not a full URL, `apiCOnfig.baseUrl` will be prepended
   * @param opts.param  Query parameters to the API
   * @param opts.config Config for the API request. See AxiosRequestConfig for detail
   * @param T           Type of the API response
   * @returns           Promise of the API request as `T`, or `null` if the response is empty, or except thrown
   */
  public unlink<T = any>(
    endpoint: string,
    opts?: ApiOptions<T> & {
      param?: {};
    },
  ) {
    return this.plainApi<T>(
      this.apisauce.unlink(
        endpoint,
        opts?.param ?? {},
        this.transformConfig(opts) as any,
      ),
      opts,
    );
  }

  /**
   * Fire a POST request to an endpoint
   *
   * @param endpoint    The API endpoint. If the path is not a full URL, `apiConfig.baseUrl` will be prepended
   * @param opts.body   Request body of the API
   * @param opts.config Config for the API request. See AxiosRequestConfig for detail
   * @param T           Type of the API response
   * @returns           Promise of the API request. Resolve as `T`, or `null` if the response is empty, or exception thrown
   */
  public post<T = any>(
    endpoint: string,
    opts?: ApiOptions<T> &
      (
        | {
            type?: 'application/json';
            body?: any;
          }
        | { type: 'application/x-www-form-urlencoded'; body: string }
      ),
  ) {
    return this.plainApi<T>(
      this.apisauce.post(
        endpoint,
        opts?.body ?? {},
        this.transformConfig({
          ...opts,
          config: {
            ...opts?.config,
            headers: {
              ...(opts?.config?.headers as any),
              'content-type':
                opts?.type ??
                (opts?.config?.headers as any)?.['content-type'] ??
                'application/json',
            },
          },
        }) as any,
      ),
    );
  }

  /**
   * Fire a PUT request to an endpoint
   *
   * @param endpoint    The API endpoint. If the path is not a full URL, `apiConfig.baseUrl` will be prepended
   * @param opts.body   Request body of the API
   * @param opts.config Config for the API request. See AxiosRequestConfig for detail
   * @param T           Type of the API response
   * @returns           Promise of the API request. Resolve as `T`, or `null` if the response is empty, or exception thrown
   */
  public put<T = any>(
    endpoint: string,
    opts?: ApiOptions<T> & {
      body?: any;
    },
  ) {
    return this.plainApi<T>(
      this.apisauce.put(
        endpoint,
        opts?.body ?? {},
        this.transformConfig(opts) as any,
      ),
    );
  }

  /**
   * Fire a PATCH request to an endpoint
   *
   * @param endpoint    The API endpoint. If the path is not a full URL, `apiConfig.baseUrl` will be prepended
   * @param opts.body   Request body of the API
   * @param opts.config Config for the API request. See AxiosRequestConfig for detail
   * @param T           Type of the API response
   * @returns           Promise of the API request. Resolve as `T`, or `null` if the response is empty, or exception thrown
   */
  public patch<T = any>(
    endpoint: string,
    opts?: ApiOptions<T> & {
      body?: any;
    },
  ) {
    return this.plainApi<T>(
      this.apisauce.patch(
        endpoint,
        opts?.body ?? {},
        this.transformConfig(opts) as any,
      ),
    );
  }
}
