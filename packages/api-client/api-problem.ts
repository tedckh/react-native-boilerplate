import { ApiResponse } from 'apisauce';

export enum ApiProblemKind {
  Timeout = 'timeout',
  CannotConnect = 'cannot-connect',
  Server = 'server',
  Unauthorized = 'unauthorized',
  Forbidden = 'forbidden',
  NotFound = 'not-found',
  Rejected = 'rejected',
  Cancelled = 'cancelled',
  Unknown = 'unknown',
}

export type ApiProblem =
  | { kind: ApiProblemKind.Timeout; temporary: true }
  | { kind: ApiProblemKind.CannotConnect; temporary: true }
  | { kind: ApiProblemKind.Server }
  | { kind: ApiProblemKind.Unauthorized }
  | { kind: ApiProblemKind.Forbidden }
  | { kind: ApiProblemKind.NotFound }
  | { kind: ApiProblemKind.Rejected }
  | { kind: ApiProblemKind.Cancelled }
  | { kind: ApiProblemKind.Unknown; temporary: true }
  | { kind: ApiProblemKind.Unknown };

/**
 * Attempts to get a common cause of problems from an api response.
 *
 * @param response The api response.
 */
export function getApiProblem(response: ApiResponse<any>): ApiProblem | null {
  if (!response) return { kind: ApiProblemKind.CannotConnect, temporary: true };

  switch (response.problem) {
    case 'CONNECTION_ERROR':
      return { kind: ApiProblemKind.CannotConnect, temporary: true };
    case 'NETWORK_ERROR':
      return { kind: ApiProblemKind.CannotConnect, temporary: true };
    case 'TIMEOUT_ERROR':
      return { kind: ApiProblemKind.Timeout, temporary: true };
    case 'SERVER_ERROR':
      return { kind: ApiProblemKind.Server };
    case 'UNKNOWN_ERROR':
      return { kind: ApiProblemKind.Unknown, temporary: true };
    case 'CLIENT_ERROR':
      if (response.status === 401) return { kind: ApiProblemKind.Unauthorized };
      if (response.status === 403) return { kind: ApiProblemKind.Forbidden };
      if (response.status === 404) return { kind: ApiProblemKind.NotFound };
      return { kind: ApiProblemKind.Rejected };
    case 'CANCEL_ERROR':
      return { kind: ApiProblemKind.Cancelled };
    default:
      return { kind: ApiProblemKind.Unknown };
  }
}
