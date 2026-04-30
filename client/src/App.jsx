import { useEffect, useRef, useState } from "react";
import "./App.css";



  function getSemanaActual() {
  const hoy = new Date();

  const dia = hoy.getDay(); // 0 domingo, 1 lunes...
  const diffLunes = (dia === 0 ? -6 : 1 - dia);

  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() + diffLunes);

  const viernes = new Date(lunes);
  viernes.setDate(lunes.getDate() + 4);

  const format = (d) => d.toISOString().split("T")[0];

  return {
    inicio: format(lunes),
    fin: format(viernes),
  };
}


function formatoFechaInput(fecha) {
  return fecha.toISOString().slice(0, 10);
}

function generarSemanas2026() {
  const semanas = [];
  let fecha = new Date("2026-01-05T12:00:00"); // primer lunes 2026

  while (fecha.getFullYear() === 2026) {
    const lunes = new Date(fecha);
    const viernes = new Date(fecha);
    viernes.setDate(lunes.getDate() + 4);

    semanas.push({
      inicio: formatoFechaInput(lunes),
      fin: formatoFechaInput(viernes),
      label: `${formatoFechaInput(lunes)} al ${formatoFechaInput(viernes)}`,
    });

    fecha.setDate(fecha.getDate() + 7);
  }

  return semanas;
}


function App() {
  const archivoInputRef = useRef(null);
  const [backendStatus, setBackendStatus] = useState("Cargando...");

  const semanas2026 = generarSemanas2026();
  const [semanaSeleccionada, setSemanaSeleccionada] = useState("");

  
  const cambiarSemanaDesdeCombo = async (e) => {
  const valor = e.target.value;
  setSemanaSeleccionada(valor);

  const semana = semanas2026.find((s) => s.inicio === valor);
  if (!semana) return;

  setSemanaInicio(semana.inicio);
  setSemanaFin(semana.fin);
  setDescripcionNota(`Descripción semana ${semana.inicio} al ${semana.fin}`);

  try {
    const response = await fetch(`${API_URL}/api/actividades`);
    const data = await response.json();

    const actividadesSemana = data.filter((item) => {
      return item.fecha >= semana.inicio && item.fecha <= semana.fin;
    });

    const items = actividadesSemana.map((item) => ({
      id: item.id,
      fecha: item.fecha,
      asignatura: item.asignatura_relacionada,
      actividad: item.actividad,
      detalle: item.observaciones,
      horarioSugerido: item.horario_sugerido
        ? JSON.parse(item.horario_sugerido)
        : {},
      estado: "cargado_bd",
    }));

    setNotaPreview({
      semanaInicio: semana.inicio,
      semanaFin: semana.fin,
      descripcion: `Semana ${semana.inicio} al ${semana.fin}`,
      items,
      archivos: [],
    });
  } catch (error) {
    console.error("Error cargando semana:", error);
    setMensajeNota("Error cargando actividades de la semana.");
  }
};


useEffect(() => {
  const semana = getSemanaActual();

  setSemanaInicio(semana.inicio);
  setSemanaFin(semana.fin);
  setDescripcionNota(`Descripción semana ${semana.inicio} al ${semana.fin}`);
}, []);


  const [archivosNota, setArchivosNota] = useState([]);
  const [notaPreview, setNotaPreview] = useState(null);
  const [mensajeNota, setMensajeNota] = useState("");

  const [mensajeChat, setMensajeChat] = useState("");
  const [conversacion, setConversacion] = useState([
    {
      tipo: "bot",
      texto:
        "Hola 👋 Pregúntame cosas como: ¿qué toca mañana?, ¿qué materiales lleva el viernes? o ¿qué hay esta semana?",
    },
  ]);





const semana = getSemanaActual();

const [semanaInicio, setSemanaInicio] = useState(semana.inicio);
const [semanaFin, setSemanaFin] = useState(semana.fin);

const [descripcionNota, setDescripcionNota] = useState(
  `Descripción semana ${semana.inicio} al ${semana.fin}`
);




const API_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:3001"
    : window.location.origin;

//  const actividadesPath = path.join(__dirname, "..", "data", "actividades.json");


      const formatearFechaDia = (fechaTexto, offsetDias) => {
        if (!fechaTexto) return "";

        const meses = [
          "enero", "febrero", "marzo", "abril", "mayo", "junio",
          "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
        ];

        const fecha = new Date(`${fechaTexto}T12:00:00`);
        fecha.setDate(fecha.getDate() + offsetDias);

        const dia = String(fecha.getDate()).padStart(2, "0");
        const mes = meses[fecha.getMonth()];
        const year = fecha.getFullYear();

        return `${dia}-${mes}-${year}`;
      };



      const handleSubmit = async (e) => {
        e.preventDefault();

        if (!semanaInicio || !semanaFin) {
          alert("Debes ingresar fechas");
          return;
        }

        try {
          const payload = {
            semanaInicio,
            semanaFin,
            descripcion: descripcionNota || "",
          };

          const res = await fetch(`${API_URL}/api/notas-semana`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          if (!res.ok) throw new Error("error backend");

          const data = await res.json();

          console.log("RESPUESTA:", data);

          alert("Guardado en Supabase ✅");

        } catch (error) {
          console.error(error);
          alert("Error guardando ❌");
        }
      };


    const detalleATexto = (detalle) => {
      if (!detalle) return "";

      if (typeof detalle === "string") return detalle;

      if (Array.isArray(detalle)) {
        return detalle
          .map((item) => {
            if (typeof item === "string") return item;

            if (typeof item === "object") {
              return Object.values(item)
                .filter(Boolean)
                .join(" ");
            }

            return String(item);
          })
          .join("\n");
      }

      if (typeof detalle === "object") {
        return Object.entries(detalle)
          .map(([key, value]) => `${key}: ${value}`)
          .join("\n");
      }

      return String(detalle);
    };

      const formatearDetalle = (detalle) => {
        let texto = detalleATexto(detalle)
          .replace(/\r/g, "")
          .replace(/\n+/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        texto = texto
          .replace(/Contenidos de la semana:\s*/i, "|||Contenidos de la semana: ")
          .replace(/Materiales:\s*/i, "|||Materiales: ")
          .replace(/Evaluaciones:\s*/i, "|||Evaluaciones: ");

        return texto
          .split("|||")
          .filter(Boolean)
          .map((parte) => {
            if (/Contenidos de la semana:/i.test(parte)) {
              return `<div class="detail-line"><span class="detail-label">Contenidos de la semana:</span> ${parte.replace(/Contenidos de la semana:\s*/i, "")}</div>`;
            }

            if (/Materiales:/i.test(parte)) {
              return `<div class="detail-line"><span class="detail-label">Materiales:</span> ${parte.replace(/Materiales:\s*/i, "")}</div>`;
            }

            if (/Evaluaciones:/i.test(parte)) {
              return `<div class="detail-line"><span class="detail-label">Evaluaciones:</span> ${parte.replace(/Evaluaciones:\s*/i, "")}</div>`;
            }

            return `<div class="detail-line">${parte}</div>`;
          })
          .join("");
      };

      useEffect(() => {
        fetch(`${API_URL}/api/health`)
          .then((res) => {
            if (!res.ok) throw new Error("error backend");
            return res.json();
          })
          .then(() => setBackendStatus("ok"))
          .catch(() => setBackendStatus("error"));
      }, []);

 const enviarMensaje = async () => {
  if (!mensajeChat.trim()) return;

  const textoUsuario = mensajeChat;

  setConversacion((prev) => [
    ...prev,
    { tipo: "usuario", texto: textoUsuario },
  ]);

  setMensajeChat("");

  try {
    const response = await fetch(`${API_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mensaje: textoUsuario,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Error backend");
    }

    setConversacion((prev) => [
      ...prev,
      { tipo: "bot", texto: data.respuesta },
    ]);
  } catch (error) {
    console.error("Error enviando mensaje:", error);

    setConversacion((prev) => [
      ...prev,
      { tipo: "bot", texto: "No se pudo conectar con el backend" },
    ]);
  }
};

  const manejarEnter = (e) => {
    if (e.key === "Enter") {
      enviarMensaje();
    }
  };

const guardarNotaSemana = async (e) => {
  e.preventDefault();
  setMensajeNota("");

  const formData = new FormData(e.currentTarget);

  try {
    const response = await fetch(`${API_URL}/api/notas-semana`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Error API notas-semana:", data);
      setMensajeNota(data.error || "No se pudo cargar la nota semanal.");
      return;
    }

    setMensajeNota("Archivos cargados. Revisa antes de guardar definitivo.");
    setNotaPreview(data.nota);
  } catch (error) {
    console.error("Error guardando nota semanal:", error);
    setMensajeNota("Error conectando con el backend.");
  }
};

  const actualizarItem = (index, campo, valor) => {
    const nuevosItems = [...notaPreview.items];
    nuevosItems[index][campo] = valor;
    setNotaPreview({ ...notaPreview, items: nuevosItems });
  };


 const obtenerItemsPrimerDia = (diaKey) => {
  if (!notaPreview?.items) return [];

  const diasOrden = ["lunes", "martes", "miercoles", "jueves", "viernes"];

  return notaPreview.items.filter((item) => {
    if (!item.horarioSugerido) return false;

    // Caso 1: horarioSugerido viene como objeto
    if (typeof item.horarioSugerido === "object") {
      const primerDia = diasOrden.find((dia) => item.horarioSugerido[dia]);
      return primerDia === diaKey;
    }

    // Caso 2: horarioSugerido viene como texto
    const bloques = String(item.horarioSugerido)
      .split("|")
      .map((b) => b.trim());

    const dias = bloques.map((b) => b.split(":")[0].toLowerCase());
    const primerDia = diasOrden.find((d) => dias.includes(d));

    return primerDia === diaKey;
  });
};

const obtenerHorarioDia = (item, diaKey) => {
  if (!item.horarioSugerido) return "";

  // Caso 1: objeto
  if (typeof item.horarioSugerido === "object") {
    return item.horarioSugerido[diaKey] || "";
  }

  // Caso 2: texto
  return (
    String(item.horarioSugerido)
      .split("|")
      .map((x) => x.trim())
      .find((x) => x.toLowerCase().startsWith(`${diaKey}:`))
      ?.replace(`${diaKey}:`, "")
      .trim() || ""
  );
};



  
  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Colegio Bot</h1>
          <p>Actividades, materiales, horario y notas semanales del colegio.</p>
        </div>

        <div className={`status-pill ${backendStatus === "ok" ? "ok" : "error"}`}>
          Backend: {backendStatus}
        </div>
      </header>

      <main className="dashboard-grid">

        <div className="left-column">
          <section className="card upload-card">
            <div className="card-header">
              <h2>Agregar nota semanal</h2>
              <span>Bulletin / imágenes / PDF</span>
            </div>

              <form onSubmit={guardarNotaSemana} className="form-grid" encType="multipart/form-data">
              <div className="row-fechas">
                <div>
                  <label>Desde</label>
                    <input
                      name="semanaInicio"
                      type="date"
                      value={semanaInicio}
                      onChange={(e) => setSemanaInicio(e.target.value)}
                    />
                </div>

                <div>
                  <label>Hasta</label>
                  <input
                    name="semanaFin"
                    type="date"
                    value={semanaFin}
                    onChange={(e) => setSemanaFin(e.target.value)}
                  />
                </div>
              </div>

              <div className="field full">
                <label>Descripción</label>
                <input
                  name="descripcion"
                  type="text"
                  value={descripcionNota}
                  onChange={(e) => setDescripcionNota(e.target.value)}
                />
              </div>

              <div className="field full">
                <label>Archivos</label>
                <input
                  name="archivos"
                  type="file"
                  accept="image/*,.pdf"
                  multiple
                />
              </div>

              <button type="submit" className="primary-button">
                Cargar y previsualizar
              </button>
            </form>

            {mensajeNota && <p className="notice"><strong>{mensajeNota}</strong></p>}
            {/*
            {notaPreview && (
              <div className="files-mini">
                {notaPreview.archivos.map((archivo, index) => (
                  <div key={index} className="mini-file-card">
                    <strong>{archivo.originalName}</strong>

                    {archivo.mimeType.startsWith("image/") && (
                      <img
                        src={`http://localhost:3001/uploads/${archivo.filename}`}
                        alt={archivo.originalName}
                      />
                    )}

                    {archivo.mimeType === "application/pdf" && <span>PDF cargado</span>}
                  </div>
                ))}
              </div>
            )}
            */}
          </section>
          <section className="card chat-card">
            <div className="card-header">
              <h2>Chat</h2>
              <span>Consultas</span>
            </div>

            <div className="chat-box">
              {conversacion.map((msg, index) => (
                <div
                  key={index}
                  className={`message-row ${msg.tipo === "usuario" ? "right" : "left"}`}
                >
                  <span className={`message-bubble ${msg.tipo}`}>{msg.texto}</span>
                </div>
              ))}
            </div>

            <div className="chat-input-row">
              <input
                type="text"
                value={mensajeChat}
                onChange={(e) => setMensajeChat(e.target.value)}
                onKeyDown={manejarEnter}
                placeholder="Ej: ¿qué toca mañana?"
              />
              <button type="button" onClick={enviarMensaje}>Enviar</button>
            </div>
          </section>



        </div>



          
          <section className="card calendar-card">

            <div className="calendar-top">

              <div className="semana-selector">
                <label>Semana 2026</label>
                <select value={semanaSeleccionada} onChange={cambiarSemanaDesdeCombo}>
                  <option value="">Seleccionar</option>
                  {semanas2026.map((semana) => (
                    <option key={semana.inicio} value={semana.inicio}>
                      {semana.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="card-header">
                <h2>Calendario semanal</h2>
                <span>Items detectados</span>
              </div>

            </div>

            <div className="week-grid">
              {[
                ["lunes", "Lun", 0],
                ["martes", "Mar", 1],
                ["miercoles", "Mié", 2],
                ["jueves", "Jue", 3],
                ["viernes", "Vie", 4],
              ].map(([diaKey, diaLabel, offset]) => (
                <div key={diaKey} className="day-card">
                  <div className="day-header">
                    {diaLabel} | {formatearFechaDia(semanaInicio, offset)}
                  </div>

                  <div className="day-body">
                    
                    

                    {obtenerItemsPrimerDia(diaKey)
                      .sort((a, b) => {
                        const horaA = obtenerHorarioDia(a, diaKey) || "99:99";
                        const horaB = obtenerHorarioDia(b, diaKey) || "99:99";
                        return horaA.localeCompare(horaB);
                      })
                      .map((item, index) => {
                      const horarioDia = obtenerHorarioDia(item, diaKey);

                      return (
                        <div key={`${diaKey}-${item.id}`} className="calendar-item compact-item">
                          <div className="compact-title">
                            <strong>{item.asignatura}</strong>
                            <span>{horarioDia}</span>
                          </div>

                          <div
                            className="compact-detail"
                            dangerouslySetInnerHTML={{
                              __html: formatearDetalle(item.detalle),
                            }}
                          />
                        </div>
                      );
                    })}

                    {obtenerItemsPrimerDia(diaKey).length === 0 && (
                      <p className="empty-day">Sin items</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>


      </main>
    </div>
  );
}

export default App;