const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { responderConsulta } = require("./chatService");

const { analizarDocumento } = require("./azureService");
const { parsearBulletin } = require("./bulletinParser");

const multer = require("multer");

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());


const dataPath = path.join(__dirname, "..", "data", "actividades.json");

const notasSemanaPath = path.join(__dirname, "..", "data", "notasSemana.json");
const uploadsPath = path.join(__dirname, "..", "data", "uploads");

app.use("/uploads", express.static(uploadsPath));

if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}


const {
  obtenerTodasActividades,
  guardarActividadesSemana,
  guardarNotaSemana,
} = require("./dataService");


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});




const upload = multer({ storage });

function leerNotasSemana() {
  const rawData = fs.readFileSync(notasSemanaPath, "utf-8");
  return JSON.parse(rawData);
}

function guardarNotasSemana(notas) {
  fs.writeFileSync(notasSemanaPath, JSON.stringify(notas, null, 2), "utf-8");
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



app.get("/", (req, res) => {
  res.json({ ok: true, message: "Servidor colegio-bot funcionando" });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/actividades", async (req, res) => {
  try {
    const actividades = await obtenerTodasActividades();
    res.json(actividades);
  } catch (error) {
    console.error("Error leyendo actividades:", error);
    res.status(500).json({ error: "No se pudieron leer las actividades" });
  }
});

app.get("/api/manana", (req, res) => {
  try {
    const fechaManana = obtenerFechaManana();
    const actividad = buscarActividadPorFecha(fechaManana);

    if (!actividad) {
      return res.json({
        fecha: fechaManana,
        mensaje: "No hay actividades registradas para mañana",
      });
    }

    res.json({
      fecha: fechaManana,
      actividad,
    });
  } catch (error) {
    console.error("Error consultando mañana:", error);
    res.status(500).json({ error: "No se pudo consultar la actividad de mañana" });
  }
});

app.post("/api/actividades", (req, res) => {
  try {
    const { fecha, actividad, materiales, observaciones } = req.body;

    if (!fecha || !actividad) {
      return res.status(400).json({
        error: "Los campos fecha y actividad son obligatorios",
      });
    }

    const actividades = leerActividades();

    const nuevaActividad = {
      fecha,
      actividad,
      materiales: Array.isArray(materiales) ? materiales : [],
      observaciones: observaciones || "",
    };

    actividades.push(nuevaActividad);
    guardarActividades(actividades);

    res.status(201).json({
      mensaje: "Actividad guardada correctamente",
      actividad: nuevaActividad,
    });
  } catch (error) {
    console.error("Error guardando actividad:", error);
    res.status(500).json({ error: "No se pudo guardar la actividad" });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    const { mensaje } = req.body;

    if (!mensaje || typeof mensaje !== "string") {
      return res.status(400).json({ error: "Debes enviar un mensaje válido" });
    }

    const respuesta = await responderConsulta(mensaje);

    res.json({ respuesta });
  } catch (error) {
    console.error("Error en chat:", error);
    res.status(500).json({ error: "No se pudo procesar el mensaje" });
  }
});


function obtenerPrimerDiaDesdeHorario(horarioSugerido) {
  const diasOrden = ["lunes", "martes", "miercoles", "jueves", "viernes"];

  if (!horarioSugerido) return "lunes";

  // Caso 1: viene como objeto
  if (typeof horarioSugerido === "object") {
    for (const dia of diasOrden) {
      if (horarioSugerido[dia]) {
        return dia;
      }
    }

    return "lunes";
  }

  // Caso 2: viene como texto
  const texto = String(horarioSugerido).toLowerCase();

  for (const dia of diasOrden) {
    if (texto.includes(`${dia}:`)) {
      return dia;
    }
  }

  return "lunes";
}

function sumarDiasAFecha(fechaTexto, dias) {
  const fecha = new Date(`${fechaTexto}T12:00:00`);
  fecha.setDate(fecha.getDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

function obtenerFechaActividad(semanaInicio, horarioSugerido) {
  const diasOffset = {
    lunes: 0,
    martes: 1,
    miercoles: 2,
    jueves: 3,
    viernes: 4,
  };

  const primerDia = obtenerPrimerDiaDesdeHorario(horarioSugerido);
  return sumarDiasAFecha(semanaInicio, diasOffset[primerDia] || 0);
}


app.post("/api/notas-semana", upload.array("archivos", 10), async (req, res) => {
  try {
    const { semanaInicio, semanaFin, descripcion } = req.body;
    console.log("📅 Fechas recibidas:", { semanaInicio, semanaFin });

    if (!semanaInicio || !semanaFin) {
      return res.status(400).json({
        error: "Debes indicar semanaInicio y semanaFin",
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: "Debes adjuntar al menos un archivo",
      });
    }


    const nuevaNota = {
      id: Date.now(),
      semanaInicio,
      semanaFin,
      descripcion: descripcion || "",
      estado: "borrador",
      archivos: req.files.map((file) => ({
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      })),
      items: [],
      fechaCarga: new Date().toISOString(),
    };

    try {
      const textosExtraidos = [];

      for (const archivo of req.files) {
        const rutaArchivo = path.join(uploadsPath, archivo.filename);
        const resultado = await analizarDocumento(rutaArchivo);

        if (resultado.content) {
          textosExtraidos.push(resultado.content);
        }
      }

      const textoFinal = textosExtraidos.join("\n\n");

      nuevaNota.textoExtraido = textoFinal;
      nuevaNota.items = parsearBulletin(textoFinal, semanaInicio);

      const actividadesParaGuardar = nuevaNota.items.map((item) => ({
        fecha: obtenerFechaActividad(semanaInicio, item.horarioSugerido),
        actividad: item.asignatura || "Actividad detectada",
        asignaturaRelacionada: item.asignatura || "",
        materiales: [],
        observaciones: item.detalle || "",
        horarioSugerido: item.horarioSugerido || "",
        origen: "bulletin",
      }));

      await guardarActividadesSemana(
        actividadesParaGuardar,
        semanaInicio,
        semanaFin
      );

      await guardarNotaSemana(nuevaNota);
      console.log("✅ Nota semanal guardada en Supabase");


      console.log("🔥 TEXTO DETECTADO:");
      console.log(textoFinal);

      console.log("✅ ITEMS DETECTADOS:");
      console.log(nuevaNota.items);

      console.log("✅ Actividades guardadas en Supabase");
    } catch (error) {
      console.error("❌ Error procesando OCR/Supabase:", error);
    }

    res.status(201).json({
      mensaje: "Archivos cargados correctamente",
      nota: nuevaNota,
    });

  } catch (error) {
    console.error("Error guardando nota semanal:", error);
    res.status(500).json({ error: "No se pudo guardar la nota semanal" });
  }
});



app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});