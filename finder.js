//const fs = require('fs');
//const path = require('path');
//import { mkdir } from 'fs/promises'; // Imports the promises-based version
//import path from 'path';
//import fs from 'fs';

const fs = require('fs');
const path = require('path');
const { mkdir } = fs.promises; // Access the promises API from the required 'fs' object



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
    const filePath = await storeData(data);
    console.info(`......`);
    console.info(filePath);
}

const storeData = async (data) =>{
    console.info(`storing data...`)
    const fileName = await getFileName();
    //const filePath = path.join(__dirname, `${fileName}`);
    const filePath = fileName;
    console.info(`file path: ${filePath}`)
    const jsonString = JSON.stringify(data, null, 2);

    fs.writeFile(filePath, jsonString, (err) => {
        if (err) {
            console.error('Error writing file:', err);
            return null;
        } else {
            console.log(`File written successfully: ${filePath}`);
            return filePath;
        }
    });

    const prom =  new Promise((resolve, reject) => {
        fs.writeFile(filePath, jsonString, (err) => {
            if (err) {
                // If there's an error, reject the Promise
                console.error('Error writing file:', err);
                return reject(err);
            } else {
                // On success, resolve the Promise with the successful data (filePath)
                console.log(`File written successfully: ${filePath}`);
                return resolve(filePath);
            }
        });
    });

    return prom;

}
const getFileName = async () =>{
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const day = String(date.getDate()).padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');

    const folderName = await createCurrentMonthFolder();

    const fileName = `${folderName}/stations-${year}-${month}-${day}_${hours}-${minutes}-${seconds}.json`;
    console.info(fileName);
    return fileName;
}

/**
 * Creates a folder with the 'yyyy-MM' format if it doesn't exist.
 */
const createCurrentMonthFolder =  async () => {
    // 1. Get the folder name (e.g., "2025-11")
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const dirName = `stations/${year}-${month}`;

    // 2. Define the path (will be created where the script is executed)
    // path.resolve() gives us the full absolute path.
    const targetPath = path.resolve(dirName);

    try {
        // 3. Create the folder
        // The { recursive: true } option ensures that:
        // 1. It creates parent directories if needed.
        // 2. It does NOT throw an error if the directory (dirName) already exists.
        await mkdir(targetPath, { recursive: true });

        console.log(`Folder ensured: ${targetPath}`);
        // You can return the path if needed
        return targetPath;

    } catch (error) {
        // This will only execute for a REAL error (e.g., lack of permissions)
        console.error(`Error creating folder '${dirName}':`, error.message);
    }
}

findNewStations().then(()=> console.info('ok')).catch((e)=> console.error(e));

const data = {
    stations: [
        { id: 1, name: "Station A" },
        { id: 2, name: "Station BBBB" }
    ]
};

//storeData(data);
