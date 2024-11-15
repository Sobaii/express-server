export interface ErrorResponse {
  status: string;
  message: string;
  code: string;
  timestamp: string;
  path?: string;
  stack?: string;
  details?: unknown;
}
