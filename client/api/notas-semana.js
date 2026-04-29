import formidable from "formidable";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

export const config = {
  api: {
    bodyParser: false,
  },
};

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const AZURE_ENDPOINT = process.env.AZURE_FORM_RECOGNIZER_ENDPOINT;
const AZURE_KEY = process.env.AZURE_FORM_RECOGNIZER_KEY;

function normalizarTexto(valor) {
  if (!valor) return "";
  if (Array.isArray(valor)) return valor[0] || "";
  return valor;
}

function sumarDias(fechaTexto, dias) {
  const fecha = new Date(`${fechaTexto}T12:00:00`);
  fecha.setDate(fecha.getDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

function horarioPorAsignatura(asignatura) {
  const nombre = asignatura.toLowerCase();

  if (nombre.includes("lenguaje")) {
    return {
      martes: "10:30-11:15",
      miercoles: "08:00-09:30",
      jueves: "08:00-09:30",
      viernes: "08:00-09:30",
    };
  }

  if (nombre.includes("math")) {
    return {
      lunes: "08:00-08:45",
      martes: "08:00-09:30",
      miercoles: "14:30-15:15",
      viernes: "14:30-15:15",
    };
  }

  if (nombre.includes("english")) {
    return {
      lunes: "10:30-12:00",
      miercoles: "12:45-14:15",
      viernes: "12:45-14:15",
    };
  }

  if (nombre.includes("science")) {
    return {
      lunes: "09:30-10:15",
      martes: "09:30-10:15",
      miercoles: "10:30-12:00",
      jueves: "12:45-14:15",
    };
  }

  if (nombre.includes("music")) {
    return {
      martes: "13:30-14:15",
      martes2: "14:30-15:15",
    };
  }

  if (nombre.includes("technology")) {
    return {
      lunes: "12:45-14:15",
    };
  }

  return {};
}

function primerDiaHorario(horario) {
  const orden = ["lunes", "martes", "miercoles", "jueves", "viernes"];

  for (const dia of orden) {
    if (horario[dia]) return dia;
  }

  return "lunes";
}

function fechaPorHorario(semanaInicio, horario) {
  const offsets = {
    lunes: 0,
    martes: 1,
    miercoles: 2,
    jueves: 3,
    viernes: 4,
  };

  const dia = primerDiaHorario(horario);
  return sumarDias(semanaInicio, offsets[dia] || 0);
}

function extraerCampo(texto, inicio, fin) {
  const regex = new RegExp(`${inicio}\\s*:?\\s*([\\s\\S]*?)(?=${fin}|$)`, "i");
  const match = texto.match(regex);
  return match ? match[1].trim() : "";
}

function parsearBulletin(texto, semanaInicio) {
  const asignaturas = [
    "Lenguaje",
    "Math",
    "English",
    "Science & Society",
    "Music",
    "Technology",
  ];

  const items = [];

  for (const asignatura of asignaturas) {
    const regex = new RegExp(
      `(ASIGNATURA:\\s*${asignatura}|SUBJECT:\\s*${asignatura})[\\s\\S]*?(?=ASIGNATURA:|SUBJECT:|$)`,
      "i"
    );

    const match = texto.match(regex);

    if (!match) continue;

    const bloque = match[0];

    const contenidos =
      extraerCampo(bloque, "Contenidos de la semana", "Materiales:|Evaluaciones:") ||
      extraerCampo(bloque, "Contents? of the week", "Materials:|Evaluations:");

    const materiales =
      extraerCampo(bloque, "Materiales", "Evaluaciones:|SUBJECT:|ASIGNATURA:") ||
      extraerCampo(bloque, "Materials", "Evaluations:|SUBJECT:|ASIGNATURA:");

    const evaluaciones =
      extraerCampo(bloque, "Evaluaciones", "SUBJECT:|ASIGNATURA:") ||
      extraerCampo(bloque, "Evaluations", "SUBJECT:|ASIGNATURA:");

    const horarioSugerido = horarioPorAsignatura(asignatura);

    const detalle = [
      contenidos ? `Contenidos de la semana: ${contenidos}` : "",
      materiales ? `Materiales: ${materiales}` : "Materiales: N/A",
      evaluaciones ? `Evaluaciones: ${evaluaciones}` : "Evaluaciones: N/A",
    ]
      .filter(Boolean)
      .join("\n");

    items.push({
      id: Date.now() + items.length,
      fecha: fechaPorHorario(semanaInicio, horarioSugerido),
      asignatura,
      actividad: asignatura,
      detalle,
      horarioSugerido,
      estado: "pendiente_revision",
    });
  }

  return items;
}

async function analizarConAzure(filePath) {
  if (!AZURE_ENDPOINT || !AZURE_KEY) {
    throw new Error("Faltan variables de Azure en Vercel");
  }

  const buffer = fs.readFileSync(filePath);

  const url = `${AZURE_ENDPOINT}/formrecognizer/documentModels/prebuilt-read:analyze?api-version=2023-07-31`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": AZURE_KEY,
      "Content-Type": "application/octet-stream",
    },
    body: buffer,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Azure analyze error: ${errorText}`);
  }

  const operationLocation = response.headers.get("operation-location");

  for (let i = 0; i < 20; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const resultResponse = await fetch(operationLocation, {
      headers: {
        "Ocp-Apim-Subscription-Key": AZURE_KEY,
      },
    });

    const result = await resultResponse.json();

    if (result.status === "succeeded") {
      return result.analyzeResult?.content || "";
    }

    if (result.status === "failed") {
      throw new Error("Azure OCR falló");
    }
  }

  throw new Error("Azure OCR timeout");
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Método no permitido" });
    }

    const form = formidable({
      multiples: true,
      keepExtensions: true,
    });

    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    const semanaInicio = normalizarTexto(fields.semanaInicio);
    const semanaFin = normalizarTexto(fields.semanaFin);
    const descripcion = normalizarTexto(fields.descripcion);

    const archivoRecibido =
      files.archivos ||
      files.archivo ||
      files.files ||
      files.file;

    const archivos = Array.isArray(archivoRecibido)
      ? archivoRecibido
      : archivoRecibido
      ? [archivoRecibido]
      : [];


    console.log("FIELDS:", fields);
    console.log("FILES:", files);
    console.log("ARCHIVOS DETECTADOS:", archivos.length);

    if (!semanaInicio || !semanaFin) {
      return res.status(400).json({ error: "Faltan fechas" });
    }

    if (archivos.length === 0) {
      return res.status(400).json({
        error: "Debes adjuntar archivo",
        fields,
        filesKeys: Object.keys(files || {}),
      });
    }

    let textoExtraido = "";

    for (const archivo of archivos) {
      const texto = await analizarConAzure(archivo.filepath);
      textoExtraido += `\n\n${texto}`;
    }

    const items = parsearBulletin(textoExtraido, semanaInicio);

    const notaId = Date.now();

    const { data: nota, error: notaError } = await supabase
      .from("notas_semana")
      .insert([
        {
          id: notaId,
          semana_inicio: semanaInicio,
          semana_fin: semanaFin,
          descripcion,
          estado: "borrador",
          texto_extraido: textoExtraido,
        },
      ])
      .select("*");

    if (notaError) throw notaError;

    const actividadesRows = items.map((item) => ({
      fecha: item.fecha,
      actividad: item.actividad,
      asignatura_relacionada: item.asignatura,
      materiales: [],
      observaciones: item.detalle,
      horario_sugerido: JSON.stringify(item.horarioSugerido),
      origen: "bulletin",
    }));

    if (actividadesRows.length > 0) {
      const { error: actividadesError } = await supabase
        .from("actividades")
        .insert(actividadesRows);

      if (actividadesError) throw actividadesError;
    }

    return res.status(200).json({
      mensaje: "Archivos cargados correctamente",
      nota: {
        id: nota?.[0]?.id || Date.now(),
        semanaInicio,
        semanaFin,
        descripcion,
        textoExtraido,
        items,
      },
    });
  } catch (error) {
    console.error("ERROR notas-semana:", error);

    return res.status(500).json({
      error: error.message || "Error procesando nota semanal",
    });
  }
}