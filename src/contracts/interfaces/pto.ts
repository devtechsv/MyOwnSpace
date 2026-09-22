export interface PtoBalance {
  horasDisponibles: number;
}

export interface CreatePtoRequestPayload {
  fecha: string; // ISO 8601 (yyyy-mm-dd)
  horas: number;
}
