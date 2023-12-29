// const STATIONS_DATA_SOURCE = 'https://cdn.jsdelivr.net/gh/andrescanavesi/ev-stations@main/stations/stations-last.json'
const STATIONS_DATA_SOURCE = 'https://cdn.jsdelivr.net/gh/andrescanavesi/ev-stations@4ba32af96f4ed20eb7a8d5f2e6f6262a0b36b257/stations/stations-2023-12-29.json'
const FAST_STATION_POWER = 45;
const CENTER_URUGUAY = { lat: -32.951477, lng: -56.114227 };
const DEFAULT_MAP_ZOOM = 7;

const fetchStations = async () =>{
    const response = await fetch(STATIONS_DATA_SOURCE);
    if (!response.ok) {
        throw new Error(`error fetching stations: ${response.status} - ${response.statusText}`);
    }
    let stations = await response.json();
    //console.info('all stations: ', stations.length)
    return filterStations(stations);
}

const reload =  () =>{
    //console.info('reload')
    fetchStations().then((stations)=> {
        loadStationsTable(stations);
        loadMap(stations);
        //console.info('reloaded')
    }).catch((err)=> console.error(err))
}

const filterStations = (stationsArray) => {
    let stations = stationsArray.map((station) =>{
        station.connectorStatusAcc.map((connector) =>{
            connector.info = `${connector.count} ${connector.type} de ${connector.power}kw ${connector.hose ? 'con cable' : 'sin cable'}`;
            return connector;
        });
        return station;
    })
    stations = stations.map((station) =>{
        station.countFastConnectors = countFastConnectorsByStation(station);
        station.maxPower = getMaxPowerByStation(station);
        return station;
    } );
    // get only public stations
    stations = stations.filter((station) => station.chargeNetworkName === 'PUBLIC');

    // filter by power
    const power = getSelectedPower();
    //console.info('power', power);
    stations = stations.filter((station) => station.maxPower >= power);

    // filter by connector type
    const connectorName = getSelectedConnector();
    //console.info('connector', connectorName);
    if(connectorName !== 'all'){
        stations = stations.filter((station) => station.connectorStatusAcc.some((connector) => connector.type === connectorName && connector.power >= power));
    }

    //console.table(stations);
    //console.info('public stations loaded:', stations.length);
    const countStationsDiv =  document.getElementById('countStations');
    if(countStationsDiv) countStationsDiv.innerHTML = stations.length;
    return sortStationsByDepartment(stations);
}

const getMaxPowerByStation = (station) => {
    let maxPower = 0
    for (const connector of station.connectorStatusAcc) {
        if(connector.power > maxPower) maxPower = connector.power;
    }
    return maxPower;
}
const getSelectedRadio = (radioName, defaultValue) => {
    const radios = document.getElementsByName(radioName);
    if(!radios) return defaultValue;
    for (let i = 0; i < radios.length; i++) {
        if(radios[i].checked){
            saveSelectedRadio(radioName, i);
            return radios[i].value;
        }
    }
}

const saveSelectedRadio = (radioName, index) => {
    const key = `${radioName}SelectedIndex`;
    //console.info(`saveSelectedRadio ${key} index: ${index}`);
    localStorage.setItem(key, index);
}

const loadSelectedRadio = (radioName) => {
    const key = `${radioName}SelectedIndex`;
    let index = localStorage.getItem(key);
    //console.info(` 1 loadSelectedRadio key: ${key} index: ${index}`);
    if(!index) index = 0;
    else index = Number(index);
    const radios = document.getElementsByName(radioName);
    if(!radios) return;
    if(!radios[index]) return;
    //console.info(` 2 loadSelectedRadio key: ${key} index: ${index}`);
    radios[index].checked = true;
}

const loadSelectedPower = () =>{
    loadSelectedRadio('powerRadio')
}
const loadSelectedConnector = () =>{
    loadSelectedRadio('connectorRadio')
}


const getSelectedPower = () => {
    return getSelectedRadio('powerRadio', 0);
}

const getSelectedConnector = () => {
    return getSelectedRadio('connectorRadio', 'all');
}


const filterByFastStations = (stations) => {
    return  stations.filter((item) => item.connectorStatusAcc.some((connector) => connector.power >= FAST_STATION_POWER));

}

const filterByDepartment = (stations, department) => {
    return stations.filter((station) => station.department === department)
}

const filterByConnectorType = (stations, connectorType) => {
    return stations.filter((station) => station.connectorStatusAcc.some((connector) => connector.type === connectorType) )
}

const countFastConnectorsByStation = (station) => {
    //console.info(station)
    return station.connectorStatusAcc.reduce((count, connector) => connector.power >= FAST_STATION_POWER ? connector.count : 0);
}

const sortStationsByDepartment = (stations) =>{
    return stations.sort((a,b)=>{
        if(a.department < b.department) return -1;
        if(a.department > b.department) return 1;
        return 0;
    })
}

const loadStationsTable = (stations)=>{
    const table = document.getElementById("stationsTable");
    if(!table) return;

    const rowCount = table.rows.length;
    //console.info('row count', rowCount)
    if(rowCount > 1){
        for (let i = 1; i < rowCount; i++) {
            table.deleteRow(1);
        }
    }

    let index = 1;
    for (const station of stations) {

        //console.info(station)
        const row = table.insertRow(index);

        const cell1 = row.insertCell(0);
        const cell2 = row.insertCell(1);
        const cell3 = row.insertCell(2);
        const cell4 = row.insertCell(3);
        const cell5 = row.insertCell(4);
        const cell6 = row.insertCell(5);

        cell1.innerHTML = index+'';
        cell2.innerHTML = station.name;
        cell3.innerHTML = station.department;
        cell4.innerHTML = station.city;
        cell5.innerHTML = station.address;

        let info = `<ul>`;
        for(const connector of station.connectorStatusAcc){
            info += `<li>${connector.info}</li>`;
        }
        info += `</ul>`;
        cell6.innerHTML = info;

        index++;
    }
}

const createMapMarker = (station, map) =>{
    const marker = new google.maps.Marker({
        position: {lat: station.lat, lng: station.lng},
        map,
        title: station.name+' '+station.address,
        animation: google.maps.Animation.DROP,
    });

    let info = `
                <b>Nombre: </b> ${station.name}
                </br>
                <b>Departamento:</b> ${station.department}
                </br>
                <b>Ciudad:</b> ${station.city}
                </br>
                <b>Dirección:</b> ${station.address}
                </br>
                <b>Conectores:</b>
                <ul>
                `
    for (const connector of station.connectorStatusAcc) {
        info += `<li>${connector.info}</li>`;
    }
    info += '</ul>';
    const infoWindow = new google.maps.InfoWindow({
        content: info,
        ariaLabel: "Info",
    });

    marker.addListener("click", () => {
        infoWindow.open({
            anchor: marker,
            map,
        });
    });
}

const loadMap = (stations)=>{
    const mapDiv = document.getElementById("map");
    if(!mapDiv) return;

    const map = new google.maps.Map(mapDiv, {
        zoom: getMapZoom(),
        center: getMapCenter(),
    });
    for (const station of stations) {
        createMapMarker(station, map);
    }

    map.addListener("zoom_changed", () => {
        //console.info('zoom changed to '+map.getZoom());
        setMapZoom(map.getZoom())

    });

    map.addListener("center_changed", () => {
        //console.info('center changed to '+map.getCenter());
        //console.info(JSON.stringify(map.getCenter()));
        getMapCenter();
        setMapCenter(map.getCenter());
    });

}

const getMapZoom = () => {
    let mapZoom = localStorage.getItem("mapZoom");
    if(!mapZoom) mapZoom = DEFAULT_MAP_ZOOM;
    //console.info('get mapZoom',mapZoom);
    return Number(mapZoom);
}

const setMapZoom = (mapZoom) => {
    //console.info('set mapZoom',mapZoom);
    localStorage.setItem("mapZoom", mapZoom);

}

const getMapCenter = () => {
    let mapCenterLat = localStorage.getItem("mapCenterLat");
    let mapCenterLng = localStorage.getItem("mapCenterLng");
    let mapCenter;
    if(!mapCenterLat || !mapCenterLng){
        mapCenter = CENTER_URUGUAY;
    } else{
        mapCenter=  {lat: parseFloat(mapCenterLat), lng: parseFloat(mapCenterLng)};
    }
    return mapCenter;
}

const setMapCenter = (mapCenter) => {
    const string = JSON.stringify(mapCenter);
    const json = JSON.parse(string);
    localStorage.setItem("mapCenterLat", json.lat);
    localStorage.setItem("mapCenterLng", json.lng);
}