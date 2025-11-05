const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// --- Configuración ---
const dbFile = './estaciones.db'; // Nombre del archivo de la base de datos

// --- 1. Conexión e Inicialización de la BD ---
let db;
try {
    // Conecta (o crea) la base de datos
    db = new Database(dbFile);

    // Habilita las Foreign Keys (importante para la integridad)
    db.exec('PRAGMA foreign_keys = ON;');

    // Ejecuta el schema para crear las tablas si no existen
    initDatabase(db);

} catch (err) {
    console.error('[ERROR] No se pudo conectar a la base de datos:', err.message);
    process.exit(1); // Termina el script si no hay BD
}

// --- 2. Función para crear las tablas ---
function initDatabase(db) {
    // Usamos 'exec' para correr múltiples sentencias
    const schema = `
    CREATE TABLE IF NOT EXISTS Estaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      direccion TEXT,
      lat REAL,
      lng REAL,
      departamento TEXT,
      ciudad TEXT
    );

    CREATE TABLE IF NOT EXISTS Grupos_Conectores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_estacion INTEGER NOT NULL,
      tipo TEXT NOT NULL,
      potencia INTEGER NOT NULL,
      cantidad_total INTEGER NOT NULL,
      FOREIGN KEY (id_estacion) REFERENCES Estaciones(id) ON DELETE CASCADE,
      UNIQUE(id_estacion, tipo, potencia)
    );

    CREATE TABLE IF NOT EXISTS Lecturas_Estado (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_grupo_conector INTEGER NOT NULL,
      timestamp TEXT NOT NULL,
      estado TEXT NOT NULL,
      FOREIGN KEY (id_grupo_conector) REFERENCES Grupos_Conectores(id) ON DELETE CASCADE
    );
  `;
    db.exec(schema);
}

// --- 3. Función principal para procesar el archivo ---
function procesarArchivo(filename) {
    console.log(`🔌 Procesando el archivo: ${filename}`);

    let fileContent;
    try {
        fileContent = fs.readFileSync(filename, 'utf8');
    } catch (err) {
        console.error(`[ERROR] No se pudo leer el archivo: ${filename}`, err.message);
        return;
    }

    // --- INICIO DE LA MODIFICACIÓN ---
    // <-- CAMBIO AQUÍ
    let estaciones;
    try {
        // Parseamos el objeto JSON completo
        const parsedJson = JSON.parse(fileContent);

        // Verificamos que la propiedad 'data' exista y sea un array
        if (parsedJson && Array.isArray(parsedJson.data)) {
            estaciones = parsedJson.data; // ¡Este es el array que iteraremos!
        } else {
            console.error(`[ERROR] El JSON no tiene la estructura esperada. No se encontró 'data' o no es un array.`);
            return; // Salimos de la función si el formato no es correcto
        }

    } catch (err) {
        console.error(`[ERROR] El JSON del archivo '${filename}' es inválido:`, err.message);
        return;
    }
    // --- FIN DE LA MODIFICACIÓN ---

    // Este es el momento en que se registra la lectura
    // Usamos el formato ISO 8601, que SQLite entiende perfectamente.
    const timestampLectura = new Date().toISOString();

    // --- 4. Preparar Sentencias SQL (mucho más rápido) ---
    const findEstacion = db.prepare('SELECT id FROM Estaciones WHERE nombre = ?');
    const insertEstacion = db.prepare('INSERT INTO Estaciones (nombre, direccion, lat, lng, departamento, ciudad) VALUES (?, ?, ?, ?, ?, ?)');

    const findGrupo = db.prepare('SELECT id FROM Grupos_Conectores WHERE id_estacion = ? AND tipo = ? AND potencia = ?');
    const insertGrupo = db.prepare('INSERT INTO Grupos_Conectores (id_estacion, tipo, potencia, cantidad_total) VALUES (?, ?, ?, ?)');

    const insertLectura = db.prepare('INSERT INTO Lecturas_Estado (id_grupo_conector, timestamp, estado) VALUES (?, ?, ?)');

    // --- 5. Transacción: Todo o nada ---
    const procesarEstaciones = db.transaction((listaEstaciones, timestamp) => {
        let lecturasInsertadas = 0;

        for (const estacion of listaEstaciones) {
            if (!estacion.name || !estacion.connectorStatusAcc) {
                console.warn(`[AVISO] Estación ignorada por faltar 'name' o 'connectorStatusAcc':`, JSON.stringify(estacion));
                continue;
            }

            // --- Paso A: Encontrar o crear la Estación ---
            let estacionDB = findEstacion.get(estacion.name);
            let estacionId;

            if (!estacionDB) {
                const info = insertEstacion.run(
                    estacion.name,
                    estacion.address,
                    estacion.lat,
                    estacion.lng,
                    estacion.department,
                    estacion.city
                );
                estacionId = info.lastInsertRowid;
            } else {
                estacionId = estacionDB.id;
            }

            // --- Paso B: Iterar, encontrar o crear Grupos de Conectores ---
            for (const conector of estacion.connectorStatusAcc) {

                // Vemos que algunos conectores vienen con tipo "" y potencia 0.
                // Los almacenamos tal cual, ya que son un grupo válido.
                const tipoConector = conector.type || ""; // Usar "" si es null o undefined
                const potenciaConector = conector.power || 0; // Usar 0 si es null o undefined

                let grupoDB = findGrupo.get(estacionId, tipoConector, potenciaConector);
                let grupoId;

                if (!grupoDB) {
                    const info = insertGrupo.run(
                        estacionId,
                        tipoConector,
                        potenciaConector,
                        conector.count
                    );
                    grupoId = info.lastInsertRowid;
                } else {
                    grupoId = grupoDB.id;
                }

                // --- Paso C: Insertar la Lectura de Estado (el dato clave) ---
                insertLectura.run(grupoId, timestamp, conector.statusDetail);
                lecturasInsertadas++;
            }
        }
        return lecturasInsertadas;
    });

    // --- 6. Ejecutar la transacción ---
    try {
        const total = procesarEstaciones(estaciones, timestampLectura);
        console.log(`✅ ¡Éxito! Se insertaron ${total} lecturas de estado.`);
    } catch (err) {
        console.error('[ERROR] Falló la transacción en la base de datos:', err.message);
    }
}

// --- 7. Ejecución del Script ---
const archivoAProcesar = process.argv[2];

if (!archivoAProcesar) {
    console.error('[ERROR] ¡Debes pasar el nombre del archivo JSON a procesar!');
    console.log('Ejemplo: node procesar.js mi_archivo.json');
    process.exit(1);
}

// Iniciar el procesamiento
procesarArchivo(path.resolve(archivoAProcesar));

// Cerrar la base de datos al final
db.close();
console.log('Cerrando conexión con la base de datos.');
