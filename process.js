// dbProcessor.js

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// Database file name
const DB_FILE = './stations.db';

/**
 * Creates the database tables if they do not exist.
 * @param {Database} db - The better-sqlite3 database instance.
 */
function initializeDatabase(db) {
    const schema = `
    CREATE TABLE IF NOT EXISTS Stations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      address TEXT,
      lat REAL,
      lng REAL,
      department TEXT,
      city TEXT
    );

    CREATE TABLE IF NOT EXISTS ConnectorGroups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      station_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      power INTEGER NOT NULL,
      total_count INTEGER NOT NULL,
      FOREIGN KEY (station_id) REFERENCES Stations(id) ON DELETE CASCADE,
      UNIQUE(station_id, type, power)
    );

    CREATE TABLE IF NOT EXISTS StatusReadings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      connector_group_id INTEGER NOT NULL,
      timestamp TEXT NOT NULL,
      status TEXT NOT NULL,
      FOREIGN KEY (connector_group_id) REFERENCES ConnectorGroups(id) ON DELETE CASCADE
    );
  `;
    db.exec(schema);
}

/**
 * Processes a JSON file, extracts station data, and saves it to the database.
 * @param {string} filename - The full path to the JSON file to process.
 * @returns {Promise<number>} A promise that resolves with the total number of readings inserted.
 */
async function processFile(filename) {
    console.log(`\n🔌 [MODULE] Starting processing of: ${path.basename(filename)}`);

    let db;
    try {
        // --- 1. DB Connection ---
        db = new Database(DB_FILE);
        db.exec('PRAGMA foreign_keys = ON;');
        initializeDatabase(db);
        console.log(`[MODULE] Connection established with ${DB_FILE}.`);

    } catch (err) {
        console.error('[ERROR] Could not connect/initialize database:', err.message);
        throw new Error('Database connection failed.');
    }

    let fileContent;
    try {
        // Reading the file synchronously (acceptable for processing scripts)
        fileContent = fs.readFileSync(filename, 'utf8');
    } catch (err) {
        db.close();
        console.error(`[ERROR] Could not read file: ${filename}`, err.message);
        throw new Error(`File read error: ${err.message}`);
    }

    // --- 2. Content Parsing ---
    let stations;
    try {
        const parsedJson = JSON.parse(fileContent);
        // Expecting the data array under the 'data' key
        if (parsedJson && Array.isArray(parsedJson.data)) {
            stations = parsedJson.data;
        } else {
            db.close();
            throw new Error(`The JSON structure is unexpected (missing 'data' or it's not an array).`);
        }
    } catch (err) {
        db.close();
        console.error(`[ERROR] JSON parsing failed for '${filename}':`, err.message);
        throw new Error(`JSON format error: ${err.message}`);
    }

    // --- 3. Prepare SQL Statements (Performance) ---
    const findStation = db.prepare('SELECT id FROM Stations WHERE name = ?');
    const insertStation = db.prepare('INSERT INTO Stations (name, address, lat, lng, department, city) VALUES (?, ?, ?, ?, ?, ?)');

    const findGroup = db.prepare('SELECT id FROM ConnectorGroups WHERE station_id = ? AND type = ? AND power = ?');
    const insertGroup = db.prepare('INSERT INTO ConnectorGroups (station_id, type, power, total_count) VALUES (?, ?, ?, ?)');

    const insertReading = db.prepare('INSERT INTO StatusReadings (connector_group_id, timestamp, status) VALUES (?, ?, ?)');

    const readingTimestamp = new Date().toISOString();

    // --- 4. Transaction: All or Nothing ---
    const processTransaction = db.transaction((stationList, timestamp) => {
        let readingsInserted = 0;

        for (const station of stationList) {

            if (!station.name || !station.connectorStatusAcc) {
                console.warn(`[WARNING] Station ignored due to missing 'name' or 'connectorStatusAcc'.`);
                continue;
            }

            // --- Step A: Find or Create Station ---
            let stationDB = findStation.get(station.name);
            let stationId;

            if (!stationDB) {
                const info = insertStation.run(
                    station.name, station.address, station.lat, station.lng,
                    station.department, station.city
                );
                stationId = info.lastInsertRowid;
            } else {
                stationId = stationDB.id;
            }

            // --- Step B: Iterate, Find or Create Connector Groups ---
            for (const connector of station.connectorStatusAcc) {
                const connectorType = connector.type || "";
                const connectorPower = connector.power || 0;

                let groupDB = findGroup.get(stationId, connectorType, connectorPower);
                let groupId;

                if (!groupDB) {
                    const info = insertGroup.run(
                        stationId, connectorType, connectorPower, connector.count
                    );
                    groupId = info.lastInsertRowid;
                } else {
                    groupId = groupDB.id;
                }

                // --- Step C: Insert the Status Reading (The core data) ---
                insertReading.run(groupId, timestamp, connector.statusDetail);
                readingsInserted++;
            }
        }
        return readingsInserted;
    });

    // --- 5. Execute Transaction and Close DB ---
    try {
        const total = processTransaction(stations, readingTimestamp);
        console.log(`✅ [MODULE] Success! Inserted ${total} status readings.`);
        return total;
    } catch (err) {
        console.error('[ERROR] Database transaction failed:', err.message);
        throw new Error(`Data insertion failed: ${err.message}`);
    } finally {
        // Ensure the database connection is closed whether successful or not
        db.close();
        console.log('[MODULE] Database connection closed.');
    }
}

// Export the main function
module.exports = {
    processFile
};
