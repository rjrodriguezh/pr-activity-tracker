const { supabase } = require("./supabaseClient");

function mapActividad(row) {
  return {
    id: row.id,
    fecha: row.fecha,
    actividad: row.actividad,
    asignaturaRelacionada: row.asignatura_relacionada,
    materiales: row.materiales || [],
    observaciones: row.observaciones || "",
    horarioSugerido: row.horario_sugerido || "",
    origen: row.origen || "",
  };
}

async function obtenerTodasActividades() {
  const { data, error } = await supabase
    .from("actividades")
    .select("*")
    .order("fecha", { ascending: true });

  if (error) {
    console.error("Error obteniendo actividades:", error);
    return [];
  }

  return data.map(mapActividad);
}

async function obtenerActividadesPorFecha(fecha) {
  const { data, error } = await supabase
    .from("actividades")
    .select("*")
    .eq("fecha", fecha)
    .order("id", { ascending: true });

  if (error) {
    console.error("Error obteniendo actividades por fecha:", error);
    return [];
  }

  return data.map(mapActividad);
}

async function guardarActividadesSemana(actividades, semanaInicio, semanaFin) {
  const { error: deleteError } = await supabase
    .from("actividades")
    .delete()
    .gte("fecha", semanaInicio)
    .lte("fecha", semanaFin)
    .eq("origen", "bulletin");

  if (deleteError) {
    throw deleteError;
  }

  if (!actividades || actividades.length === 0) {
    return [];
  }

  const rows = actividades.map((item) => ({
    fecha: item.fecha,
    actividad: item.actividad,
    asignatura_relacionada: item.asignaturaRelacionada,
    materiales: item.materiales || [],
    observaciones: item.observaciones || "",
    horario_sugerido: item.horarioSugerido || "",
    origen: item.origen || "bulletin",
  }));

  const { data, error } = await supabase
    .from("actividades")
    .insert(rows)
    .select("*");

  if (error) {
    throw error;
  }

  return data.map(mapActividad);
}

module.exports = {
  obtenerTodasActividades,
  obtenerActividadesPorFecha,
  guardarActividadesSemana,
  guardarNotaSemana,
};


async function guardarNotaSemana(nota) {
  const { data, error } = await supabase
    .from("notas_semana")
    .upsert({
      id: nota.id,
      semana_inicio: nota.semanaInicio,
      semana_fin: nota.semanaFin,
      descripcion: nota.descripcion || "",
      estado: nota.estado || "borrador",
      texto_extraido: nota.textoExtraido || "",
    })
    .select("*");

  if (error) {
    throw error;
  }

  return data?.[0];
}