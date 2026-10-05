export interface PtoBalance {
  horasDisponibles: number;
  // Lo que se devenga en el periodo vigente; se libera en fechaProximoPeriodo.
  horasEnAcumulacion: number;
  fechaProximoPeriodo: string; // ISO 8601 (yyyy-mm-dd), próximo aniversario
}

export interface CreatePtoRequestPayload {
  fecha: string; // ISO 8601 (yyyy-mm-dd)
  horas: number;
}
