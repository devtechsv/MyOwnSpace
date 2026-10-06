# Manual de usuario — MyOwnSpace

MyOwnSpace es la herramienta interna de DevTech para pedir permisos (emergencias, enfermedad, trámites personales, vacaciones) y, si eres administrador, para aprobarlos o denegarlos.

Este manual no requiere conocimientos técnicos — solo explica qué hace cada pantalla y cada botón.

## Ingresar al sistema

1. Abre MyOwnSpace en el navegador. Vas a ver la pantalla **"Bienvenido a MyOwnSpace"**.
2. Ingresa tu **Correo electrónico** y tu **Contraseña**, y toca **"Ingresar"**.

Si tu sesión estuvo inactiva mucho tiempo, la próxima vez que hagas algo vas a ver el mensaje *"Tu sesión expiró por inactividad. Inicia sesión nuevamente para continuar."* — es normal, solo vuelve a ingresar tu correo y contraseña.

### Olvidé mi contraseña

1. En la pantalla de ingreso, toca **"¿Olvidaste tu contraseña?"**.
2. Ingresa tu correo y toca **"Enviar instrucciones"**.
3. Vas a ver el mensaje **"Revisa tu correo"** — si tu correo está registrado, en unos minutos te va a llegar una contraseña temporal. Úsala para ingresar; después el sistema te va a pedir que definas una nueva. La temporal vence en 48 horas.

Pedir una temporal **no** cambia tu contraseña actual: si la recuerdas, puedes seguir entrando con ella y la temporal se descarta. Si recibes un correo con una temporal que no pediste, puedes ignorarlo. Solo se envían hasta 3 temporales por hora para un mismo correo.

### La primera vez que ingresas (o después de que te resetean la contraseña)

Cuando entras con una contraseña temporal (la que te llega por correo al crear tu cuenta o al pedir un reseteo), el sistema te va a mostrar **"Cambiar tu contraseña"** con el aviso *"Entraste con una contraseña temporal — elige una propia para seguir usando MyOwnSpace."* No vas a poder usar el resto de la aplicación hasta hacer este paso.

Completa:
- **Contraseña actual** (la temporal que recibiste)
- **Nueva contraseña**
- **Confirmar nueva contraseña**

Debajo del formulario vas a ver los requisitos que tiene que cumplir tu nueva contraseña (largo mínimo, mayúscula, minúscula, número, carácter especial, y que no sea una genérica ni la misma temporal) — se van marcando en verde a medida que los cumples. Toca **"Guardar"** cuando termines.

## Si eres Empleado

### Mis solicitudes

Es la pantalla que ves al ingresar. Ahí están todas tus solicitudes con su **Tipo**, **Fecha**, **Motivo** y **Estado** (**Pendiente**, **Aprobada** o **Denegada**). Si una fue denegada, puedes tocar el motivo para ver por qué (**"Ver motivo completo"**).

Puedes filtrar por tipo de solicitud (**"Filtrar por tipo de solicitud"**) o por una fecha puntual.

**Para pedir un permiso:**

1. Toca **"Crear solicitud"**.
2. Elige el **Tipo de solicitud**: Emergencia, Enfermedad, Permiso personal, u Otro.
3. Completa **Desde** y **Hasta** (las fechas del permiso). Si necesitas especificar un horario dentro del día, completa también **"Hora desde (opcional)"** y **"Hora hasta (opcional)"** — van juntas, o ninguna.
4. Escribe el **Motivo**.
5. Toca **"Enviar solicitud"**. Queda en estado **Pendiente** hasta que un administrador la revise.

Las vacaciones **no** se piden desde este formulario — tienen su propia pantalla, "Mi PTO" (ver abajo).

### Mi PTO (vacaciones)

Aquí reclamas las horas de vacaciones que vas ganando y pides tus vacaciones.

**Cómo funciona** (Código de Trabajo de El Salvador, art. 177 a 180):

- **Cada quincena trabajada suma 5 horas** a tus horas **"Acumuladas"** (120 horas, es decir 15 días de 8 horas, por año completo).
- Para que sean tuyas tienes que tocar **"Reclamar"**. Pasan a **"Reclamadas por habilitar"**. **Si no las reclamas antes del 31 de diciembre, se pierden** el 1 de enero.
- Las horas reclamadas **se habilitan al cumplir tu año laboral** (tu aniversario de ingreso) y desde ese momento aparecen en **"Disponibles"**. Las horas reclamadas no vencen nunca.
- Para que un año laboral habilite sus horas necesitas **al menos 200 días trabajados** en ese año (art. 180). Las ausencias aprobadas de día completo (enfermedad, emergencia, permisos) no cuentan como días trabajados. En la tarjeta del medio ves cuántos días llevas.

**Cómo pedir vacaciones:**

- **Varios días:** toca **"Solicitar vacaciones"**, elige la **fecha de inicio** y la **fecha de fin**. Antes de enviar verás cuántos días hábiles son y cuántas horas descuentan (solo cuentan de lunes a viernes, 8 horas por día). No pueden empezar en sábado ni domingo. La solicitud queda **pendiente** hasta que un administrador la apruebe, y mientras tanto ya aparta esas horas.
- **Un solo día o unas horas:** toca un día disponible en el calendario y elige **"Jornada completa (8h)"** o **"Tiempo personalizado"**. Igual que las vacaciones por rango, queda **pendiente** hasta que un administrador la apruebe; mientras tanto, esas horas ya se descuentan de tu disponible. No se pueden pedir días pasados ni sábados o domingos.
- En el calendario, los días aprobados se marcan en color y los pendientes de aprobación en ámbar.

## Si eres Administrador

Además de tu propia sección de empleado, tienes tres pantallas más en el menú lateral: **Solicitudes**, **Usuarios** y **PTO**.

### Solicitudes del equipo

Aquí revisas y decides las solicitudes de todo el equipo. Hay pestañas: **Pendientes**, **Aprobadas**, **Denegadas** y **Todas** (cada una muestra su cantidad). Puedes filtrar por tipo, por fecha o elegir un empleado de la lista.

- Para aprobar una solicitud pendiente, toca **"Aprobar"**.
- Para denegarla, toca **"Denegar"** — te va a pedir un **"Motivo del rechazo"**, que el empleado va a ver junto a su solicitud. Toca **"Denegar"** para confirmar.
- Las **vacaciones** que piden los empleados también llegan aquí (tipo **Vacaciones**), tanto las de un solo día como las de un rango de fechas. Al aprobarlas, el sistema vuelve a revisar que el empleado tenga horas suficientes; si ya no le alcanzan, te avisa y la solicitud sigue pendiente.

### Usuarios

Aquí administras las cuentas del equipo. Arriba vas a ver tres contadores: **Total usuarios**, **Activos** y **Pendientes**.

- **Crear usuario:** toca **"Crear usuario"**, completa **Nombre completo**, **Correo electrónico**, **Rol** (Empleado o Administrador) y **Fecha de ingreso**. Por defecto, la casilla **"Generar contraseña automáticamente"** está marcada y el sistema crea la contraseña. Si la desmarcas, puedes escribir tú la **Contraseña temporal** (debe cumplir los mismos requisitos que cualquier contraseña). En ambos casos el nuevo usuario la recibe por correo y debe cambiarla al ingresar por primera vez.
- **Editar usuario:** toca el ícono de **"Editar"** en la fila del usuario para cambiar su nombre, correo o rol.
- **Resetear contraseña:** disponible solo para usuarios Activos. Le manda una nueva contraseña temporal por correo: su contraseña anterior deja de funcionar en el acto, se cierran sus sesiones y deberá cambiar la temporal al ingresar.
- **Activar / Desactivar:** desactivar a alguien le quita el acceso al sistema hasta que un administrador lo reactive.

### PTO del equipo

Vista de solo lectura para planificar — muestra las vacaciones ya aprobadas de todo el equipo (las pendientes se deciden en "Solicitudes"). Puedes filtrar por mes y elegir un empleado de la lista (aparecen quienes tienen vacaciones en el mes elegido).

## Otras cosas útiles

- **Modo oscuro / claro:** hay un botón en la barra superior para alternar el tema visual.
- **Cambiar tu contraseña cuando quieras:** desde el menú con tu nombre (arriba a la derecha), elige **"Cambiar contraseña"**.
- **Cerrar sesión:** mismo menú, opción **"Cerrar sesión"**.

## Preguntas frecuentes

**No me llegó el correo con la contraseña temporal.** Revisa spam/correo no deseado. Si sigue sin aparecer, pídele a un administrador que te resetee la contraseña de nuevo, o que confirme que tu correo está bien cargado en el sistema.

**Mi cuenta dice que está desactivada y no puedo entrar.** Contacta a un administrador para que la reactive desde el panel de Usuarios.

**Entré a una pantalla que no existe o no me corresponde.** El sistema muestra una página **"Esta página no existe"** — toca **"Volver al inicio"**.
