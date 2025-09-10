import { ApiResponse } from 'apisauce';
import { ApiProblem } from './api-problem';

export class ApiError<T = any> extends Error {
  /**
   * The kind of the error
   *
   * `server` - 5xx / The server experienced a problem
   * `unauthorized` - 401 / We're not allowed because we haven't identified ourself
   * `forbidden` - 403 / We don't have access to perform that request
   * `not-found` - 404 / Unable to find that resource
   * `rejected` - 4xx / All other 4xx series errors
   * `timeout` - The request did not returned in the predefined time
   * `cannot-connect` - Cannot connect to the server for some reason
   * `cancelled` - The request is being cancelled by the frontend custom logic
   * `unknown` - Something truly unexpected happened. Most likely there should be an original error
   */
  public readonly kind: ApiProblem['kind'];

  /**
   * Is the error temporary. `true` only when the error could be try again
   */
  public readonly isTemporary: boolean;

  /**
   * The API response object. Available only when there is no internal error in frontend
   */
  public readonly response?: ApiResponse<T>;

  /**
   * The original error object. Available only when the error is thrown by an underneath calls
   */
  public readonly originalError?: Error;

  public constructor(
    apiProblem: ApiProblem,
    response?: ApiResponse<T>,
    originalError?: Error,
  ) {
    super(apiProblem.kind);

    this.kind = apiProblem.kind;

    this.isTemporary =
      (apiProblem as { temporary: true | undefined }).temporary ?? false;

    this.response = response;

    this.originalError = originalError;

    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export function isApiError(error: any) {
  return error instanceof ApiError;
}
