import { AxiosError, AxiosResponse } from 'axios';

// Error tal como lo lanza axios contra el API real: el message es genérico
// ("Request failed with status code 409") y el texto legible viene en el
// `detail` del ProblemDetails. El mock, en cambio, lanza Error con el texto
// ya legible — por eso las pruebas solo con el mock no detectaban el bug.
export function errorDelApi(status: number, detail?: string): AxiosError {
  return new AxiosError(
    `Request failed with status code ${status}`,
    'ERR_BAD_REQUEST',
    undefined,
    undefined,
    { status, data: detail ? { detail } : {} } as AxiosResponse,
  );
}
