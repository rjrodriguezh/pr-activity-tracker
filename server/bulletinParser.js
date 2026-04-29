const fs = require("fs");
const path = require("path");

const horarioPath = path.join(__dirname, "..", "data", "horario.json");

function leerHorario() {
  const rawData = fs.readFileSync(horarioPath, "utf-8");
  return JSON.parse(rawData);
}

function normalizar(texto) {
  return (texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\./g, "")
    .trim();
}

function limpiarTexto(texto) {
  return (texto || "")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function detectarAsignatura(linea) {
  const t = normalizar(linea);

  if (t.includes("lenguaje")) return "Lenguaje";
  if (t.includes("math")) return "Math";
  if (t.includes("english eal")) return "English EAL";
  if (t.includes("english")) return "English";
  if (t.includes("science & society") || t.includes("science")) return "Science & Society";
  if (t.includes("music")) return "Music";
  if (t.includes("technology")) return "Technology";
  if (t.includes("arts")) return "Arts";
  if (t.includes("pe") || t.includes("physical")) return "P.E.";
  if (t.includes("orientacion")) return "Orientación";
  if (t.includes("religion") || t.includes("valores")) return "Religión / Valores";

  return null;
}

function unirRangos(rangos) {
  if (!rangos.length) return "";

  const inicios = rangos.map((r) => r.split("-")[0]);
  const fines = rangos.map((r) => r.split("-")[1]);

  return `${inicios[0]}-${fines[fines.length - 1]}`;
}

function obtenerHorariosAsignatura(asignatura) {
  const horario = leerHorario();
  const buscada = normalizar(asignatura);

  const diasOrden = ["lunes", "martes", "miercoles", "jueves", "viernes"];
  const resultado = {};

  diasOrden.forEach((dia) => {
    const bloques = horario[dia] || [];

    const rangos = bloques
      .filter((bloque) => {
        const asignaturaBloque = normalizar(bloque.asignatura);

        return (
          asignaturaBloque === buscada ||
          asignaturaBloque.includes(buscada) ||
          buscada.includes(asignaturaBloque)
        );
      })
      .map((bloque) => bloque.hora);

    resultado[dia] = unirRangos(rangos);
  });

  return resultado;
}

function cerrarItem(items, itemActual) {
  if (!itemActual) return;

  itemActual.detalle = itemActual.detalle.trim();
  itemActual.horarioSugerido = obtenerHorariosAsignatura(itemActual.asignatura);

  const yaExiste = items.some(
    (item) => normalizar(item.asignatura) === normalizar(itemActual.asignatura)
  );

  if (!yaExiste) {
    items.push(itemActual);
  }
}

function parsearBulletin(textoExtraido, semanaInicio) {
  const texto = limpiarTexto(textoExtraido);
  const lineas = texto
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const items = [];
  let itemActual = null;

  for (const linea of lineas) {
    const asignatura = detectarAsignatura(linea);

    const esEncabezado =
      normalizar(linea).startsWith("subject") ||
      normalizar(linea).startsWith("asignatura") ||
      ["lenguaje", "math", "english", "science & society", "music", "technology", "arts"].includes(
        normalizar(linea)
      );

    if (asignatura && esEncabezado) {
      cerrarItem(items, itemActual);

      itemActual = {
        id: Date.now() + items.length,
        fecha: semanaInicio,
        asignatura,
        horarioSugerido: obtenerHorariosAsignatura(asignatura),
        detalle: "",
        estado: "pendiente_revision",
      };

      continue;
    }

    if (!itemActual) continue;

    itemActual.detalle += itemActual.detalle ? `\n${linea}` : linea;
  }

  cerrarItem(items, itemActual);

  return items.length > 0
    ? items
    : [
        {
          id: Date.now(),
          fecha: semanaInicio,
          asignatura: "",
          horarioSugerido: "No encontrado en horario",
          detalle: texto.slice(0, 1000) || "Completar o corregir manualmente",
          estado: "pendiente_revision",
        },
      ];
}

module.exports = { parsearBulletin };