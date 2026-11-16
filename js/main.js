"use strict";

// Pizarra Tactica simulador de plantilla de fútbol
// Pre-entrega 8: Sincronización de estado entre DOM y Storage
// Autora: Juanita Callejas Castro
//
// Flujo de cada acción del usuario:
//   1. Se actualiza el array de datos en JavaScript.
//   2. Se guarda la versión actualizada en localStorage (JSON.stringify).
//   3. Se vuelve a renderizar la vista para reflejar el cambio.
//
// Índice:
//   1. Constantes
//   2. Clase Jugador y datos del mercado
//   3. Estado de la aplicación
//   4. Utilidades
//   5. Persistencia (localStorage)
//   6. Cálculos y reglas del juego
//   7. Acciones del usuario
//   8. Renderizado (DOM)
//   9. Eventos
//  10. Inicio

// 1. CONSTANTES

const PREFIJO = "pizarra-tactica";

const CLAVES = {
  plantilla: `${PREFIJO}:plantilla`,
  formacion: `${PREFIJO}:formacion`,
  capitan: `${PREFIJO}:capitan`,
  equipo: `${PREFIJO}:equipo`,
  guardadoEn: `${PREFIJO}:guardado-en`,
};

const PRESUPUESTO_TOTAL = 650;      // en millones
const TAMANO_ONCE = 11;
const FORMACION_INICIAL = "4-3-3";
const EQUIPO_INICIAL = "Mi equipo";
const VALORACION_ELITE = 85;

// Cuántos jugadores de cada posición admite cada formación
const FORMACIONES = {
  "4-3-3": { POR: 1, DEF: 4, MED: 3, DEL: 3 },
  "4-4-2": { POR: 1, DEF: 4, MED: 4, DEL: 2 },
  "3-5-2": { POR: 1, DEF: 3, MED: 5, DEL: 2 },
};

const POSICIONES = {
  POR: "Portero",
  DEF: "Defensa",
  MED: "Mediocampista",
  DEL: "Delantero",
};

const ORDEN_POSICIONES = ["POR", "DEF", "MED", "DEL"];

// Altura (en %) de cada línea sobre la cancha
const ALTURA_LINEAS = { DEL: 20, MED: 46, DEF: 70, POR: 90 };



// 2. CLASE JUGADOR Y DATOS DEL MERCADO
class Jugador {
  constructor(id, nombre, posicion, edad, valoracion, precio, dorsal) {
    this.id = id;
    this.nombre = nombre;
    this.posicion = posicion;
    this.edad = edad;
    this.valoracion = valoracion;
    this.precio = precio;
    this.dorsal = dorsal;
  }

  // Indica si es un jugador de élite según su valoración
  esElite() {
    return this.valoracion >= VALORACION_ELITE;
  }
}

// Jugadores ficticios del mercado de fichajes
const mercado = [
  new Jugador(1, "Emilio Arango", "POR", 28, 81, 34, 1),
  new Jugador(2, "Joaquín Valdés", "POR", 25, 84, 46, 13),
  new Jugador(3, "Tomás Quiroga", "POR", 34, 76, 18, 25),

  new Jugador(4, "Santiago Orozco", "DEF", 26, 86, 58, 2),
  new Jugador(5, "Esteban Mora", "DEF", 24, 85, 54, 3),
  new Jugador(6, "Camilo Benavides", "DEF", 27, 83, 44, 4),
  new Jugador(7, "Julián Cardona", "DEF", 29, 82, 40, 5),
  new Jugador(8, "Andrés Calderón", "DEF", 31, 80, 32, 6),
  new Jugador(9, "Mateo Ledesma", "DEF", 22, 79, 30, 15),
  new Jugador(10, "Iván Rueda", "DEF", 33, 77, 22, 16),
  new Jugador(11, "Nicolás Pardo", "DEF", 21, 75, 20, 23),

  new Jugador(12, "Diego Navarro", "MED", 27, 90, 80, 8),
  new Jugador(13, "Sebastián Cruz", "MED", 25, 88, 68, 10),
  new Jugador(14, "Lucas Ferreira", "MED", 26, 85, 54, 14),
  new Jugador(15, "Daniel Salcedo", "MED", 28, 82, 40, 17),
  new Jugador(16, "Martín Iglesias", "MED", 30, 81, 36, 18),
  new Jugador(17, "Felipe Montoya", "MED", 24, 79, 30, 20),
  new Jugador(18, "Gabriel Peña", "MED", 23, 78, 26, 21),
  new Jugador(19, "Alejandro Bustos", "MED", 32, 76, 19, 24),

  new Jugador(20, "Leandro Pizarro", "DEL", 26, 91, 86, 9),
  new Jugador(21, "Rodrigo Escobar", "DEL", 28, 89, 74, 11),
  new Jugador(22, "Samuel Idrobo", "DEL", 24, 87, 62, 7),
  new Jugador(23, "Maximiliano Vega", "DEL", 27, 84, 48, 19),
  new Jugador(24, "Kevin Zambrano", "DEL", 29, 80, 33, 22),
  new Jugador(25, "Bruno Cifuentes", "DEL", 22, 78, 27, 26),
  new Jugador(26, "Óscar Villamil", "DEL", 34, 76, 18, 27),
];

// 3. ESTADO DE LA APLICACIÓN

const estado = {
  plantilla: [],                 // array de objetos guardado en localStorage
  formacion: FORMACION_INICIAL,
  capitanId: null,
  equipo: EQUIPO_INICIAL,
  guardadoEn: null,
  filtro: "TODOS",
  busqueda: "",
  orden: "valoracion",
  pendiente: null,               // acción a confirmar: "vaciar" o "restablecer"
};

let temporizadorMensaje;



// 4. UTILIDADES
const $ = (id) => document.getElementById(id);

const formatearMillones = (valor) => `€${valor} M`;

// Quita tildes y pasa a minúsculas para comparar textos
const normalizarTexto = (texto) =>
  texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

// Crea un elemento con clase y texto opcionales
function crear(etiqueta, clase = "", texto = "") {
  const elemento = document.createElement(etiqueta);
  if (clase) elemento.className = clase;
  if (texto !== "") elemento.textContent = String(texto);
  return elemento;
}

// Muestra un mensaje al usuario en la propia página
function mostrarMensaje(texto, tipo = "ok") {
  const caja = $("mensaje");
  $("mensaje-texto").textContent = texto;
  caja.className = `mensaje mensaje--${tipo} visible`;

  clearTimeout(temporizadorMensaje);
  temporizadorMensaje = setTimeout(() => caja.classList.remove("visible"), 3400);
}



// 5. PERSISTENCIA (localStorage)

// Lee un valor JSON. Si no existe todavía, devuelve el valor por defecto (operador ??)
function leerJSON(clave, valorPorDefecto) {
  try {
    return JSON.parse(localStorage.getItem(clave)) ?? valorPorDefecto;
  } catch {
    return valorPorDefecto;
  }
}

// Guarda un valor como JSON. Devuelve true si se pudo guardar
function guardarJSON(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
    return true;
  } catch {
    return false;
  }
}

// Recupera el estado guardado, o usa valores iniciales si es la primera visita
function cargarEstado() {
  const plantillaGuardada = leerJSON(CLAVES.plantilla, []);
  const formacionGuardada = localStorage.getItem(CLAVES.formacion) ?? FORMACION_INICIAL;
  const capitanGuardado = leerJSON(CLAVES.capitan, null);

  // Se descartan datos dañados o incompletos (operador ?.)
  const plantillaValida = Array.isArray(plantillaGuardada)
    ? plantillaGuardada.filter((ficha) => ficha?.id !== undefined && POSICIONES[ficha?.posicion])
    : [];

  estado.plantilla = plantillaValida;
  estado.formacion = FORMACIONES[formacionGuardada] ? formacionGuardada : FORMACION_INICIAL;
  estado.capitanId = plantillaValida.some(({ id }) => id === capitanGuardado) ? capitanGuardado : null;
  estado.equipo = localStorage.getItem(CLAVES.equipo) ?? EQUIPO_INICIAL;
  estado.guardadoEn = localStorage.getItem(CLAVES.guardadoEn);
}

// Guarda en localStorage la versión actual del estado
function guardarEstado() {
  const { plantilla, formacion, capitanId, equipo } = estado;
  estado.guardadoEn = new Date().toISOString();

  const resultados = [
    guardarJSON(CLAVES.plantilla, plantilla),
    guardarJSON(CLAVES.capitan, capitanId),
  ];

  try {
    localStorage.setItem(CLAVES.formacion, formacion);
    localStorage.setItem(CLAVES.equipo, equipo);
    localStorage.setItem(CLAVES.guardadoEn, estado.guardadoEn);
  } catch {
    resultados.push(false);
  }

  return resultados.every(Boolean);
}

// Guarda y vuelve a pintar: el paso que mantiene sincronizados array, storage y DOM
function sincronizar() {
  const guardado = guardarEstado();
  renderizarTodo();

  if (!guardado) {
    mostrarMensaje("No pudimos guardar tus datos en este navegador.", "error");
  }
}

// Borra una clave del storage
const borrarClave = (clave) => localStorage.removeItem(clave);



// 6. CÁLCULOS Y REGLAS DEL JUEGO

const calcularInversion = (lista) => lista.reduce((total, { precio }) => total + precio, 0);

const calcularMedia = (lista) =>
  lista.length > 0
    ? Math.round(lista.reduce((suma, { valoracion }) => suma + valoracion, 0) / lista.length)
    : 0;

const contarPorPosicion = (lista, posicion) => lista.filter((ficha) => ficha.posicion === posicion).length;

const obtenerApellido = (nombre) => nombre.split(" ").at(-1);

// Ordena la plantilla por línea y dorsal
const ordenarPlantilla = (lista) =>
  [...lista].sort(
    (a, b) => ORDEN_POSICIONES.indexOf(a.posicion) - ORDEN_POSICIONES.indexOf(b.posicion) || a.dorsal - b.dorsal
  );

// Devuelve un texto con el motivo si no se puede fichar, o null si todo está bien
function validarFichaje(jugador) {
  const { id, nombre, posicion, precio } = jugador;
  const cupos = FORMACIONES[estado.formacion]?.[posicion] ?? 0;
  const restante = PRESUPUESTO_TOTAL - calcularInversion(estado.plantilla);

  if (estado.plantilla.some((ficha) => ficha.id === id)) {
    return `${nombre} ya está en tu plantilla.`;
  }
  if (estado.plantilla.length >= TAMANO_ONCE) {
    return "Tu once ya está completo. Quita a alguien para fichar otro jugador.";
  }
  if (contarPorPosicion(estado.plantilla, posicion) >= cupos) {
    return `En el ${estado.formacion} solo caben ${cupos} jugador(es) de la posición ${posicion}.`;
  }
  if (precio > restante) {
    return `No alcanza el presupuesto: ${nombre} cuesta ${formatearMillones(precio)} y te quedan ${formatearMillones(restante)}.`;
  }
  return null;
}


// 7. ACCIONES DEL USUARIO
// Cada una actualiza el array, guarda en localStorage y vuelve a pintar.

function ficharJugador(id) {
  const jugador = mercado.find((item) => item.id === id);
  if (!jugador) return;

  const motivo = validarFichaje(jugador);
  if (motivo) {
    mostrarMensaje(motivo, "error");
    return;
  }

  // Destructuring: se guarda solo lo necesario del jugador
  const { nombre, posicion, valoracion, precio, dorsal } = jugador;
  estado.plantilla.push({ id, nombre, posicion, valoracion, precio, dorsal });

  mostrarMensaje(`${nombre} fichado por ${formatearMillones(precio)}.`, "ok");
  sincronizar();
}

function quitarJugador(id) {
  const ficha = estado.plantilla.find((item) => item.id === id);

  estado.plantilla = estado.plantilla.filter((item) => item.id !== id);
  estado.capitanId = estado.capitanId === id ? null : estado.capitanId;

  mostrarMensaje(`${ficha?.nombre ?? "El jugador"} salió de tu plantilla.`, "info");
  sincronizar();
}

function alternarCapitan(id) {
  const ficha = estado.plantilla.find((item) => item.id === id);
  if (!ficha) return;

  const yaEsCapitan = estado.capitanId === id;
  estado.capitanId = yaEsCapitan ? null : id;

  mostrarMensaje(
    yaEsCapitan ? `${ficha.nombre} ya no es el capitán.` : `${ficha.nombre} es tu nuevo capitán.`,
    "info"
  );
  sincronizar();
}

function cambiarFormacion(nueva) {
  const reglas = FORMACIONES[nueva];
  if (!reglas || nueva === estado.formacion) return;

  // Se busca una posición que tenga más jugadores de los que permite la nueva formación
  const exceso = Object.entries(reglas).find(([posicion, cupos]) => contarPorPosicion(estado.plantilla, posicion) > cupos);

  if (exceso) {
    const [posicion, cupos] = exceso;
    mostrarMensaje(`Para jugar con ${nueva} deja máximo ${cupos} jugador(es) en ${posicion}. Quita a alguien primero.`, "error");
    return;
  }

  estado.formacion = nueva;
  mostrarMensaje(`Formación cambiada a ${nueva}.`, "info");
  sincronizar();
}

function renombrarEquipo(valor) {
  estado.equipo = valor.trim() || EQUIPO_INICIAL;
  mostrarMensaje(`Tu equipo ahora se llama ${estado.equipo}.`, "info");
  sincronizar();
}

// Vacía la plantilla y borra esos datos del localStorage
function vaciarPlantilla() {
  estado.plantilla = [];
  estado.capitanId = null;

  borrarClave(CLAVES.plantilla);
  borrarClave(CLAVES.capitan);

  mostrarMensaje("Plantilla vaciada.", "info");
  renderizarTodo();
}

// Borra todos los datos del simulador (solo las claves propias, sin tocar otros proyectos)
function restablecerTodo() {
  Object.values(CLAVES).forEach(borrarClave);

  Object.assign(estado, {
    plantilla: [],
    formacion: FORMACION_INICIAL,
    capitanId: null,
    equipo: EQUIPO_INICIAL,
    guardadoEn: null,
    filtro: "TODOS",
    busqueda: "",
    orden: "valoracion",
  });

  $("buscador").value = "";
  $("orden").value = "valoracion";

  mostrarMensaje("Simulador restablecido a su estado inicial.", "info");
  renderizarTodo();
}

// Pide confirmación dentro de la página antes de borrar datos
function pedirConfirmacion(accion) {
  estado.pendiente = accion;
  $("confirmacion-texto").textContent =
    accion === "vaciar"
      ? "¿Quieres quitar a todos los jugadores de tu plantilla?"
      : "¿Quieres borrar todos los datos guardados y volver al inicio?";
  $("confirmacion").hidden = false;
  $("btn-confirmar").focus();
}

function cerrarConfirmacion() {
  estado.pendiente = null;
  $("confirmacion").hidden = true;
}

function confirmarAccion() {
  const accion = estado.pendiente;
  cerrarConfirmacion();

  if (accion === "vaciar") vaciarPlantilla();
  if (accion === "restablecer") restablecerTodo();
}

// 8. RENDERIZADO (DOM)

function renderizarMarcador() {
  const { plantilla, capitanId, guardadoEn } = estado;
  const inversion = calcularInversion(plantilla);
  const porcentaje = Math.min(100, Math.round((inversion / PRESUPUESTO_TOTAL) * 100));
  const capitan = plantilla.find(({ id }) => id === capitanId);

  $("dato-jugadores").textContent = `${plantilla.length}/${TAMANO_ONCE}`;
  $("dato-media").textContent = plantilla.length > 0 ? calcularMedia(plantilla) : "--";
  $("dato-presupuesto").textContent = formatearMillones(PRESUPUESTO_TOTAL - inversion);
  $("dato-capitan").textContent = capitan?.nombre ?? "Sin capitán";

  const barra = $("barra-presupuesto");
  barra.style.width = `${porcentaje}%`;
  barra.classList.toggle("limite", porcentaje >= 90);

  const hora = guardadoEn
    ? new Date(guardadoEn).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })
    : null;
  const guardado = $("dato-guardado");
  guardado.textContent = hora ? `Guardado automáticamente a las ${hora}` : "Aún sin guardar";
  guardado.classList.toggle("sin-guardar", !hora);

  const campoEquipo = $("nombre-equipo");
  if (campoEquipo.value !== estado.equipo) campoEquipo.value = estado.equipo;
}

function renderizarFormaciones() {
  document.querySelectorAll("[data-formacion]").forEach((boton) => {
    boton.setAttribute("aria-pressed", String(boton.dataset.formacion === estado.formacion));
  });
}

function crearFichaLlena({ nombre, posicion, dorsal, id }) {
  const ficha = crear("div", `ficha pos-${posicion}`);
  const disco = crear("span", "ficha__disco", dorsal);

  if (id === estado.capitanId) disco.appendChild(crear("span", "ficha__capitan", "C"));

  ficha.appendChild(disco);
  ficha.appendChild(crear("span", "ficha__nombre", obtenerApellido(nombre)));
  return ficha;
}

function crearHueco(posicion) {
  const hueco = crear("button", `hueco pos-${posicion}`);
  hueco.type = "button";
  hueco.dataset.hueco = posicion;
  hueco.setAttribute("aria-label", `Buscar un ${POSICIONES[posicion].toLowerCase()} para este puesto`);

  hueco.appendChild(crear("span", "hueco__disco", "+"));
  hueco.appendChild(crear("span", "hueco__texto", posicion));
  return hueco;
}

function renderizarCancha() {
  const contenedor = $("jugadores-cancha");
  contenedor.replaceChildren();

  Object.entries(FORMACIONES[estado.formacion]).forEach(([posicion, cupos]) => {
    const asignados = ordenarPlantilla(estado.plantilla).filter((ficha) => ficha.posicion === posicion);

    for (let indice = 0; indice < cupos; indice++) {
      const jugador = asignados[indice];
      const elemento = jugador ? crearFichaLlena(jugador) : crearHueco(posicion);

      elemento.style.left = `${((indice + 1) / (cupos + 1)) * 100}%`;
      elemento.style.top = `${ALTURA_LINEAS[posicion]}%`;
      contenedor.appendChild(elemento);
    }
  });
}

// Aplica filtro, búsqueda y orden al mercado
function obtenerMercadoVisible() {
  const { filtro, busqueda, orden } = estado;
  const texto = normalizarTexto(busqueda);

  const criterios = {
    valoracion: (a, b) => b.valoracion - a.valoracion,
    precio: (a, b) => a.precio - b.precio,
    nombre: (a, b) => a.nombre.localeCompare(b.nombre, "es"),
  };

  return mercado
    .filter(({ posicion, nombre }) => (filtro === "TODOS" || posicion === filtro) && normalizarTexto(nombre).includes(texto))
    .sort(criterios[orden] ?? criterios.valoracion);
}

function crearFilaMercado(jugador) {
  const { id, nombre, posicion, edad, valoracion, precio, dorsal } = jugador;
  const enPlantilla = estado.plantilla.some((ficha) => ficha.id === id);

  const fila = crear("li", enPlantilla ? "fila fila--activa" : "fila");
  fila.appendChild(crear("span", `dorsal pos-${posicion}`, dorsal));

  const info = crear("div", "fila__info");
  const titulo = crear("strong", "", nombre);
  if (jugador.esElite()) titulo.appendChild(crear("span", "elite", "Élite"));
  info.appendChild(titulo);
  info.appendChild(crear("span", "fila__meta", `${POSICIONES[posicion]}, ${edad} años`));
  fila.appendChild(info);

  const valor = crear("span", "valor", valoracion);
  valor.appendChild(crear("small", "", "valoración"));
  fila.appendChild(valor);

  fila.appendChild(crear("span", "precio", formatearMillones(precio)));

  const boton = crear("button", enPlantilla ? "btn btn--linea" : "btn btn--amarillo", enPlantilla ? "Quitar" : "Fichar");
  boton.type = "button";
  boton.dataset[enPlantilla ? "quitar" : "fichar"] = id;
  boton.setAttribute("aria-label", `${enPlantilla ? "Quitar a" : "Fichar a"} ${nombre}`);
  fila.appendChild(boton);

  return fila;
}

function renderizarMercado() {
  const lista = $("lista-mercado");
  const visibles = obtenerMercadoVisible();
  const posicionScroll = lista.scrollTop;   // se conserva el scroll al volver a pintar

  lista.replaceChildren();
  $("contador").textContent = `Mostrando ${visibles.length} de ${mercado.length} jugadores`;

  document.querySelectorAll("[data-filtro]").forEach((chip) => {
    chip.setAttribute("aria-pressed", String(chip.dataset.filtro === estado.filtro));
  });

  if (visibles.length === 0) {
    lista.appendChild(crear("li", "vacio", "No encontramos jugadores con esos filtros."));
    return;
  }

  visibles.forEach((jugador) => lista.appendChild(crearFilaMercado(jugador)));
  lista.scrollTop = posicionScroll;
}

function crearFilaOnce(ficha) {
  const { id, nombre, posicion, valoracion, precio, dorsal } = ficha;
  const esCapitan = id === estado.capitanId;

  const fila = crear("li", "fila fila--once");
  fila.appendChild(crear("span", `dorsal pos-${posicion}`, dorsal));

  const info = crear("div", "fila__info");
  info.appendChild(crear("strong", "", nombre));
  info.appendChild(crear("span", "fila__meta", POSICIONES[posicion]));
  fila.appendChild(info);

  const valor = crear("span", "valor", valoracion);
  valor.appendChild(crear("small", "", "valoración"));
  fila.appendChild(valor);

  fila.appendChild(crear("span", "precio", formatearMillones(precio)));

  const capitan = crear("button", "btn-capitan", "C");
  capitan.type = "button";
  capitan.dataset.capitan = id;
  capitan.setAttribute("aria-pressed", String(esCapitan));
  capitan.setAttribute("aria-label", esCapitan ? `Quitar la capitanía a ${nombre}` : `Nombrar capitán a ${nombre}`);
  fila.appendChild(capitan);

  const quitar = crear("button", "btn btn--linea", "Quitar");
  quitar.type = "button";
  quitar.dataset.quitar = id;
  quitar.setAttribute("aria-label", `Quitar a ${nombre}`);
  fila.appendChild(quitar);

  return fila;
}

function renderizarOnce() {
  const lista = $("lista-once");
  lista.replaceChildren();

  ordenarPlantilla(estado.plantilla).forEach((ficha) => lista.appendChild(crearFilaOnce(ficha)));
  $("vacio-once").hidden = estado.plantilla.length > 0;
}

function renderizarTodo() {
  renderizarMarcador();
  renderizarFormaciones();
  renderizarCancha();
  renderizarMercado();
  renderizarOnce();
}



// 9. EVENTOS

function iniciarEventos() {
  // Mercado: fichar o quitar (delegación de eventos)
  $("lista-mercado").addEventListener("click", (evento) => {
    const boton = evento.target.closest("button");
    if (!boton) return;

    const { fichar, quitar } = boton.dataset;
    if (fichar) ficharJugador(Number(fichar));
    if (quitar) quitarJugador(Number(quitar));
  });

  // Tu once: capitán y quitar
  $("lista-once").addEventListener("click", (evento) => {
    const boton = evento.target.closest("button");
    if (!boton) return;

    const { capitan, quitar } = boton.dataset;
    if (capitan) alternarCapitan(Number(capitan));
    if (quitar) quitarJugador(Number(quitar));
  });

  // Cancha: tocar un hueco filtra el mercado por esa posición
  $("jugadores-cancha").addEventListener("click", (evento) => {
    const hueco = evento.target.closest("[data-hueco]");
    if (!hueco) return;

    estado.filtro = hueco.dataset.hueco;
    renderizarMercado();
    $("titulo-mercado").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // Formaciones
  document.querySelectorAll("[data-formacion]").forEach((boton) => {
    boton.addEventListener("click", () => cambiarFormacion(boton.dataset.formacion));
  });

  // Filtros por posición
  document.querySelectorAll("[data-filtro]").forEach((chip) => {
    chip.addEventListener("click", () => {
      estado.filtro = chip.dataset.filtro;
      renderizarMercado();
    });
  });

  // Búsqueda y orden
  $("buscador").addEventListener("input", (evento) => {
    estado.busqueda = evento.target.value;
    renderizarMercado();
  });

  $("orden").addEventListener("change", (evento) => {
    estado.orden = evento.target.value;
    renderizarMercado();
  });

  // Nombre del equipo (se guarda al terminar de escribir)
  $("nombre-equipo").addEventListener("change", (evento) => renombrarEquipo(evento.target.value));

  // Datos del simulador
  $("btn-vaciar").addEventListener("click", () => pedirConfirmacion("vaciar"));
  $("btn-restablecer").addEventListener("click", () => pedirConfirmacion("restablecer"));
  $("btn-confirmar").addEventListener("click", confirmarAccion);
  $("btn-cancelar").addEventListener("click", cerrarConfirmacion);

  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && estado.pendiente) cerrarConfirmacion();
  });

  // Si el simulador se modifica en otra pestaña, esta se actualiza sola
  window.addEventListener("storage", (evento) => {
    if (evento.key === null || evento.key?.startsWith(PREFIJO)) {
      cargarEstado();
      renderizarTodo();
    }
  });
}



// 10. INICIO

document.addEventListener("DOMContentLoaded", () => {
  cargarEstado();
  iniciarEventos();
  renderizarTodo();

  // Si había datos guardados, se avisa que se recuperaron
  const { length: cantidad } = estado.plantilla;
  if (cantidad > 0) {
    mostrarMensaje(
      `Recuperamos tu plantilla: ${cantidad} ${cantidad === 1 ? "jugador" : "jugadores"} de ${estado.equipo}.`,
      "info"
    );
  }
});