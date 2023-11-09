const stationsOld = require('./stations/stations-2023-11-08.json');
const stationsNew = require('./stations/stations-2023-11-09.json');

// it detects the new stations added
const newOnes = [];

for (const stationNew of stationsNew) {
    let found = false;
    for (const stationOld of stationsOld) {
        if(stationOld.lat == stationNew.lat && stationOld.lng == stationNew.lng) found = true;

    }
    if(!found) newOnes.push(stationNew);
}

console.table(newOnes)

