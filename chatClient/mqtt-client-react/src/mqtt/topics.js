export const AUTH_REGISTER = '/auth/register';
export const AUTH_LOGIN = '/auth/login';
export const AUTH_RESPONSE_BASE = '/auth/response/';
export function responseFor(username) {
  return `${AUTH_RESPONSE_BASE}${username}`;
}