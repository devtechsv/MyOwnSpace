export interface PtoBalance {
  // Reclamadas y habilitadas, menos vacaciones aprobadas y pendientes.
  horasDisponibles: number;
  // Ganadas y sin reclamar; se borran el 1 de enero si no se reclaman.
  horasAcumuladas: number;
  // Reclamadas que se habilitan en fechaProximaHabilitacion (aniversario).
  horasReclamadasBloqueadas: number;
  fechaProximaHabilitacion: string; // ISO 8601 (yyyy-mm-dd)
  diasTrabajadosAnioLaboral: number;
  diasTrabajadosMinimos: number; // art. 180
  fechaLimiteReclamo: string; // ISO 8601, 31-dic del año en curso
}

export interface CreatePtoRequestPayload {
  fecha: string; // ISO 8601 (yyyy-mm-dd)
  horas: number;
}

// Vacaciones por rango: días hábiles × 8h, queda Pendiente de un admin.
export interface CreateVacationRequestPayload {
  fechaInicio: string; // ISO 8601 (yyyy-mm-dd)
  fechaFin: string;
  motivo?: string;
}
