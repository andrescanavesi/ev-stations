const stationsOldest = require('./stations/stations-2023-11-08.json');
const stationsOld = require('./stations/stations-2025-11-06.json'); // 08-08
const stationsNew = require('./stations/stations-2025-11-07.json');

// it detects the new stations added
const newOnes = [];
let newOnesFriendly = [];

for (const stationNew of stationsNew.data) {
    let found = false;
    for (const stationOld of stationsOld.data) {
        if(stationOld.lat == stationNew.lat && stationOld.lng == stationNew.lng) found = true;

    }
    if(!found){
        const elem = {
            nombre: stationNew.name,
            departamento: stationNew.department,
            ciudad: stationNew.city

        };
        let connectorText = '';
        for (const connector of stationNew.connectorStatusAcc) {
            const conn = `${connector.type}-${connector.power}kw`;
            if(!elem[conn]) elem[conn] = connector.count;
        }
        newOnesFriendly.push(elem);
        newOnes.push(stationNew);
    }
}

const removed = [];
let removedFriendly = [];
for (const stationOld of stationsOldest) {
    let found = false;
    for (const stationNew of stationsNew.data) {
        if(stationOld.lat == stationNew.lat && stationOld.lng == stationNew.lng) found = true;
    }
    if(!found) {

        const elem = {
            nombre: stationOld.name,
            departamento: stationOld.department,
            ciudad: stationOld.city

        };
        let connectorText = '';
        for (const connector of stationOld.connectorStatusAcc) {
            const conn = `${connector.type}-${connector.power}kw`;
            if(!elem[conn]) elem[conn] = connector.count;
        }
        removedFriendly.push(elem);

        removed.push(stationOld);
    }
}



console.info('new ones');
//console.table(newOnes);
console.table(newOnesFriendly);
//console.log(JSON.stringify(newOnes, null, 2))

//console.info('removed');
//console.table(removedFriendly);

/**
 * Processes the charging station JSON and returns a Map
 * with the count of stations per connector type.
 *
 * @param {object} jsonData The full JSON object with the "data" key.
 * @returns {Map<string, number>} A Map where the key is the connector type
 * and the value is the number of stations that offer it.
 */
function countStationsByConnector(jsonData) {
    // Access the array of stations
    const stations = jsonData.data;

    // Create the Map that will hold the results
    const stationCount = new Map();

    // 1. Iterate over each station in the array
    for (const station of stations) {

        // 2. Use a Set to store the UNIQUE connector types for this station
        // This avoids double-counting a station if it has, e.g., 2 "CCS2" connectors
        const typesInThisStation = new Set();

        // Check if 'connectorStatusAcc' exists and is an array
        if (Array.isArray(station.connectorStatusAcc)) {
            // 3. Iterate over the connectors of the current station
            for (const connector of station.connectorStatusAcc) {
                // Add the type to the Set (even if it's "", as in one case)
                typesInThisStation.add(connector.type);
            }
        }

        // 4. Now, iterate over the UNIQUE types for this station
        for (const type of typesInThisStation) {
            let typeName = type;
            if(!type){
                typeName = 'Unknown'
            }
            // Get the current count (or 0 if this is the first time we've seen this type)
            const currentCount = stationCount.get(typeName) || 0;

            // Update the count in the main Map, adding 1 for this station
            stationCount.set(typeName, currentCount + 1);


        }
    }

    // 5. Return the Map with the final counts
    return stationCount;
}
/**
 * Counts the number of available connectors of each type from a list of EV charging stations.
 *
 * @param {Array<Object>} stations - An array of charging station objects.
 * @returns {Map<string, number>} A map where keys are connector types and values are their total counts.
 */
function countConnectorTypes(stations) {
    const connectorCounts = new Map();

    // Iterate over each station in the provided array
    for (const station of stations.data) {
        // Check if the station has the connectorStatusAcc property and it's an array
        if (station.connectorStatusAcc && Array.isArray(station.connectorStatusAcc)) {
            // Iterate over each connector in the station's connector list
            for (const connector of station.connectorStatusAcc) {
                // Use 'Unknown' for connectors with an empty or undefined type string
                let type = connector.type && connector.type.trim() !== '' ? connector.type : 'Unknown';
                const count = connector.count || 0;

                // If the connector type is already in the map, add to its count
                if (connectorCounts.has(type)) {
                    connectorCounts.set(type, connectorCounts.get(type) + count);
                } else {
                    // Otherwise, add the new connector type to the map
                    connectorCounts.set(type, count);
                }
            }
        }
    }

    return connectorCounts;
}

// Call the function with the station data
const counts = countConnectorTypes(stationsNew);

const countByConnector = countStationsByConnector(stationsNew);

// Display the results
console.log("Cantidad de cargadores por tipo:");
console.log(counts);

console.log("Cantidad de estaciones por tipo de conector:");
console.log(countByConnector);
