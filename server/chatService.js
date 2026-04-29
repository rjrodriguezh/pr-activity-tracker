const fs = require("fs");
const path = require("path");

const {
  obtenerTodasActividades,
  obtenerActividadesPorFecha,
} = require("./dataService");

const horarioPath = path.join(__dirname, "..", "data", "horario.json");

function leerHorario() {
  const rawData = fs.readFileSync(horarioPath, "utf-8");
  return JSON.parse(rawData);
}

function escaparHtml(texto) {
  return String(texto || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatearFecha(fecha) {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function obtenerFechaManana() {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + 1);
  return formatearFecha(fecha);
}

function obtenerFechaPasadoManana() {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + 2);
  return formatearFecha(fecha);
}

function construirRespuestaActividades(actividades, fecha) {
  if (!actividades || actividades.length === 0) {
    return `No hay actividades registradas para ${escaparHtml(fecha)}.`;
  }

  return `📅 <b>Para ${escaparHtml(fecha)} tienes ${actividades.length} actividad(es):</b>\n\n` +
    actividades
      .map((actividad, index) => {
        const materialesTexto =
          actividad.materiales?.length > 0
            ? actividad.materiales.join(", ")
            : "sin materiales registrados";

        return `${index + 1}) <b>${escaparHtml(
          actividad.actividad || actividad.asignaturaRelacionada
        )}</b>
<b>Asignatura:</b> ${escaparHtml(actividad.asignaturaRelacionada || "sin asignatura")}
<b>Materiales:</b> ${escaparHtml(materialesTexto)}
<b>Observaciones:</b> ${escaparHtml(actividad.observaciones || "sin observaciones")}`;
      })
      .join("\n\n");
}

function construirResumenActividades(actividades) {
  if (!actividades || actividades.length === 0) {
    return "No hay actividades registradas.";
  }

  return [...actividades]
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map(
      (item) =>
        `${escaparHtml(item.fecha)}: <b>${escaparHtml(
          item.actividad || item.asignaturaRelacionada
        )}</b>`
    )
    .join("\n");
}

function obtenerNombreDia(fecha) {
  const dias = [
    "domingo",
    "lunes",
    "martes",
    "miercoles",
    "jueves",
    "viernes",
    "sabado",
  ];
  return dias[fecha.getDay()];
}

function obtenerFechaDesdeNombreDia(nombreDia) {
  const diasSemana = {
    domingo: 0,
    lunes: 1,
    martes: 2,
    miercoles: 3,
    miércoles: 3,
    jueves: 4,
    viernes: 5,
    sabado: 6,
    sábado: 6,
  };

  const targetDay = diasSemana[nombreDia];
  if (targetDay === undefined) return null;

  const fecha = new Date();
  const hoyDia = fecha.getDay();

  let diferencia = targetDay - hoyDia;
  if (diferencia < 0) diferencia += 7;

  fecha.setDate(fecha.getDate() + diferencia);
  return formatearFecha(fecha);
}

function obtenerHorarioPorFecha(fechaTexto) {
  const horario = leerHorario();
  const fecha = new Date(`${fechaTexto}T12:00:00`);
  const nombreDia = obtenerNombreDia(fecha);

  if (nombreDia === "domingo" || nombreDia === "sabado") {
    return `Para ${escaparHtml(fechaTexto)} (${escaparHtml(
      nombreDia
    )}) no hay horario cargado.`;
  }

  const bloques = horario[nombreDia] || [];

  if (bloques.length === 0) {
    return `No hay horario registrado para ${escaparHtml(fechaTexto)}.`;
  }

  return `<b>Horario de ${escaparHtml(fechaTexto)} (${escaparHtml(
    nombreDia
  )}):</b>\n` + bloques.map((b) => `${escaparHtml(b.hora)} ${escaparHtml(b.asignatura)}`).join("\n");
}

async function obtenerActividadesSemanaActual() {
  const actividades = await obtenerTodasActividades();
  const hoy = new Date();

  const inicio = new Date(hoy);
  const dia = inicio.getDay();
  const ajusteLunes = dia === 0 ? -6 : 1 - dia;
  inicio.setDate(inicio.getDate() + ajusteLunes);
  inicio.setHours(0, 0, 0, 0);

  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + 6);
  fin.setHours(23, 59, 59, 999);

  return actividades.filter((item) => {
    const fechaItem = new Date(`${item.fecha}T12:00:00`);
    return fechaItem >= inicio && fechaItem <= fin;
  });
}

async function responderConsulta(textoOriginal) {
  const texto = textoOriginal.trim().toLowerCase();

  if (texto.includes("hola")) {
    return "Hola 👋 Puedes preguntarme: <b>qué hay mañana</b>, <b>qué hay hoy</b>, <b>qué hay pasado mañana</b>, <b>qué hay el viernes</b>, <b>qué hay esta semana</b> o <b>cuál es el horario del viernes</b>.";
  }

  if (
    texto.includes("todas las actividades") ||
    texto.includes("mostrar actividades")
  ) {
    const actividades = await obtenerTodasActividades();
    return construirResumenActividades(actividades);
  }

  if (texto.includes("esta semana") || texto.includes("semana actual")) {
    const actividadesSemana = await obtenerActividadesSemanaActual();
    return `<b>Actividades de esta semana:</b>\n${construirResumenActividades(
      actividadesSemana
    )}`;
  }

  const esConsultaHorario =
    texto.includes("horario") ||
    texto.includes("ramos") ||
    texto.includes("clases") ||
    texto.includes("asignaturas");

  if (texto.includes("pasado mañana")) {
    const fecha = obtenerFechaPasadoManana();
    return esConsultaHorario
      ? obtenerHorarioPorFecha(fecha)
      : construirRespuestaActividades(
          await obtenerActividadesPorFecha(fecha),
          fecha
        );
  }

  if (texto.includes("mañana")) {
    const fecha = obtenerFechaManana();
    return esConsultaHorario
      ? obtenerHorarioPorFecha(fecha)
      : construirRespuestaActividades(
          await obtenerActividadesPorFecha(fecha),
          fecha
        );
  }

  if (texto.includes("hoy")) {
    const fecha = formatearFecha(new Date());
    return esConsultaHorario
      ? obtenerHorarioPorFecha(fecha)
      : construirRespuestaActividades(
          await obtenerActividadesPorFecha(fecha),
          fecha
        );
  }

  const fechaDetectada = texto.match(/\d{4}-\d{2}-\d{2}/);
  if (fechaDetectada) {
    const fecha = fechaDetectada[0];
    return esConsultaHorario
      ? obtenerHorarioPorFecha(fecha)
      : construirRespuestaActividades(
          await obtenerActividadesPorFecha(fecha),
          fecha
        );
  }

  const diasSemana = [
    "lunes",
    "martes",
    "miercoles",
    "miércoles",
    "jueves",
    "viernes",
    "sabado",
    "sábado",
    "domingo",
  ];

  for (const dia of diasSemana) {
    if (texto.includes(dia)) {
      const fecha = obtenerFechaDesdeNombreDia(dia);
      return esConsultaHorario
        ? obtenerHorarioPorFecha(fecha)
        : construirRespuestaActividades(
            await obtenerActividadesPorFecha(fecha),
            fecha
          );
    }
  }

  return "No entendí. Prueba con: <b>qué hay mañana</b>, <b>qué hay hoy</b>, <b>qué hay esta semana</b> o <b>cuál es el horario del viernes</b>.";
}

module.exports = { responderConsulta };