// Validaciones de forma de una solicitud de vacaciones por rango, en el
// mismo orden y con los mismos mensajes que PtoRequestsService.ValidarRango
// del backend (la fuente de verdad). Las usan el modal, para avisar antes
// de enviar, y el modo simulado. Las dos implementaciones corren los casos
// de test-data/pto-calculadora-casos.json ("validacionRango").
// Sin fechaFin (el usuario todavía no la eligió) solo se revisa el inicio.
import { esDiaHabil, sumarAnios } from './dias-habiles';

export function validarRangoVacaciones(hoy: string, fechaInicio: string, fechaFin?: string): string | null {
  if (fechaFin && fechaFin < fechaInicio) {
    return 'La fecha de fin no puede ser anterior a la fecha de inicio.';
  }
  if (fechaInicio < hoy) {
    return 'No puedes solicitar vacaciones en fechas pasadas.';
  }
  // Art. 178: las vacaciones no pueden iniciarse en día de descanso.
  if (!esDiaHabil(fechaInicio)) {
    return 'Las vacaciones no pueden iniciar en sábado ni domingo.';
  }
  if (fechaFin && fechaFin > sumarAnios(fechaInicio, 1)) {
    return 'El rango de vacaciones no puede superar un año.';
  }
  return null;
}
