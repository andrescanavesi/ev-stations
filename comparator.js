const stationsOldest = require('./stations/stations-2023-11-08.json');
const stationsOld = require('./stations/stations-2025-09-12.json'); // 08-08
const stationsNew = require('./stations/stations-2025-09-24.json');

// it detects the new stations added
const newOnes = [];
let newOnesFriendly = [];

for (const stationNew of stationsNew) {
    let found = false;
    for (const stationOld of stationsOld) {
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
    for (const stationNew of stationsNew) {
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
 * Counts the number of available connectors of each type from a list of EV charging stations.
 *
 * @param {Array<Object>} stations - An array of charging station objects.
 * @returns {Map<string, number>} A map where keys are connector types and values are their total counts.
 */
function countConnectorTypes(stations) {
    const connectorCounts = new Map();

    // Iterate over each station in the provided array
    for (const station of stations) {
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

// Display the results
console.log("Cantidad de cargadores por tipo:");
console.log(counts);
