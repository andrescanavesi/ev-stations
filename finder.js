const fs = require('fs');
const path = require('path');



const findNewStations = async () => {
    console.info('getting ev stations...');
    //const url  = 'https://movilidad.ute.com.uy/api/station/status/'; // old one from 2025-09-25

    // this new url outputs a different json
    const url  = 'https://movilidad.ute.com.uy/api/v1/station/status/map';
    const response = await fetch(url, {
        method: "GET",
        headers: {
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8",
            "X-Requested-With": "XMLHttpRequest",
            "Referer": "https://movilidad.ute.com.uy/carga.html?tab=red-de-carga"
        }
    });

    if (!response.ok) {
        throw new Error(`HTTP error Status: ${response.status} ${response.statusText}`);
    }
    console.info('response data ok');
    //console.info(await response.text());
    const data = await response.json();
    console.info(`stations found: ${data.length}`);
    storeData(data);
}

storeData = (data) =>{
    const fileName = getFileName();
    const filePath = path.join(__dirname, `stations/${fileName}`);
    const jsonString = JSON.stringify(data, null, 2);

    fs.writeFile(filePath, jsonString, (err) => {
        if (err) {
            console.error('Error writing file:', err);
        } else {
            console.log(`File written successfully: ${filePath}`);
        }
    });
}
getFileName = () =>{
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const day = String(date.getDate()).padStart(2, '0');

    return `stations-${year}-${month}-${day}.json`;
}

findNewStations().then(()=> console.info('ok')).catch((e)=> console.error(e));

const data = {
    stations: [
        { id: 1, name: "Station A" },
        { id: 2, name: "Station BBBB" }
    ]
};

//storeData(data);
