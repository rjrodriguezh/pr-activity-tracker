import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [backendStatus, setBackendStatus] = useState("Cargando...");

  const [semanaInicio, setSemanaInicio] = useState("");
  const [semanaFin, setSemanaFin] = useState("");
  const [descripcionNota, setDescripcionNota] = useState("");
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

          const res = await fetch(`${window.location.origin}/api/notas-semana`, {
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
        fetch(`${window.location.origin}/api/health`)
          .then((res) => {
            if (!res.ok) throw new Error("error backend");
            return res.json();
          })
          .then(() => setBackendStatus("ok"))
          .catch(() => setBackendStatus("error"));
      }, []);

  const enviarMensaje = async () => {
    const texto = mensajeChat.trim();
    if (!texto) return;

    const nuevaConversacion = [
      ...conversacion,
      { tipo: "usuario", texto },
    ];

    setConversacion(nuevaConversacion);
    setMensajeChat("");

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mensaje: texto }),
      });

      const data = await response.json();

      if (!response.ok) {
        setConversacion([
          ...nuevaConversacion,
          { tipo: "bot", texto: data.error || "Ocurrió un error" },
        ]);
        return;
      }

      setConversacion([
        ...nuevaConversacion,
        { tipo: "bot", texto: data.respuesta },
      ]);
    } catch (error) {
      console.error("Error enviando mensaje:", error);
      setConversacion([
        ...nuevaConversacion,
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

  if (!semanaInicio || !semanaFin) {
    setMensajeNota("Debes indicar semana desde y semana hasta.");
    return;
  }

  if (!archivosNota || archivosNota.length === 0) {
    setMensajeNota("Debes seleccionar al menos un archivo.");
    return;
  }

  const formData = new FormData();
  formData.append("semanaInicio", semanaInicio);
  formData.append("semanaFin", semanaFin);
  formData.append("descripcion", descripcionNota || "");

  archivosNota.forEach((archivo) => {
    formData.append("archivos", archivo);
  });

  try {
    const response = await fetch(`${window.location.origin}/api/notas-semana`, {
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

            <form onSubmit={handleSubmit} className="form-grid">
              <div className="row-fechas">
                <div>
                  <label>Desde</label>
                  <input
                    type="date"
                    value={semanaInicio}
                    onChange={(e) => setSemanaInicio(e.target.value)}
                  />
                </div>

                <div>
                  <label>Hasta</label>
                  <input
                    type="date"
                    value={semanaFin}
                    onChange={(e) => setSemanaFin(e.target.value)}
                  />
                </div>
              </div>

              <div className="field full">
                <label>Descripción</label>
                <input
                  type="text"
                  value={descripcionNota}
                  onChange={(e) => setDescripcionNota(e.target.value)}
                  placeholder="Ej: Weekly Bulletin April 27 to May 1"
                />
              </div>

              <div className="field full">
                <label>Archivos</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  multiple
                  onChange={(e) => setArchivosNota(Array.from(e.target.files))}
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
            <div className="card-header">
              <h2>Calendario semanal</h2>
              <span>Items detectados</span>
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