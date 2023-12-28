const stationsOldest = require('./stations/stations-2023-11-08.json');
const stationsOld = require('./stations/stations-2023-12-24.json');
const stationsNew = require('./stations/stations-2023-12-28.json');

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
            ciudad: stationNew.city,
            direccion: stationNew.address,
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
for (const stationOld of stationsOldest) {
    let found = false;
    for (const stationNew of stationsNew) {
        if(stationOld.lat == stationNew.lat && stationOld.lng == stationNew.lng) found = true;
    }
    if(!found) removed.push(stationOld);
}



console.info('new ones');
console.table(newOnes);
console.table(newOnesFriendly);
//console.log(JSON.stringify(newOnes, null, 2))

console.info('removed');
console.table(removed);


