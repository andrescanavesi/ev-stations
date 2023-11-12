const STATIONS_DATA_SOURCE = 'https://cdn.jsdelivr.net/gh/andrescanavesi/ev-stations@main/stations/stations-last.json'
const FAST_STATION_POWER = 45;
const CENTER_URUGUAY = { lat: -32.951477, lng: -56.114227 };
const DEFAULT_MAP_ZOOM = 7;
const fetchStations = async () =>{
    const response = await fetch(STATIONS_DATA_SOURCE);
    if (!response.ok) {
        throw new Error(`error fetching stations: ${response.status} - ${response.statusText}`);
    }
    let stations = await response.json();
    console.info('all stations: ', stations.length)
    return filterStations(stations);
}

const reload =  () =>{
    console.info('reload')
    fetchStations().then((stations)=> {
        loadStationsTable(stations);
        loadMap(stations);
        console.info('reloaded')
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
    console.info('power', power);
    stations = stations.filter((station) => station.maxPower >= power);

    // filter by connector type
    const connectorName = getSelectedConnector();
    console.info('connector', connectorName);
    if(connectorName !== 'all'){
        stations = stations.filter((station) => station.connectorStatusAcc.some((connector) => connector.type === connectorName && connector.power >= power));
    }

    //console.table(stations);
    console.info('public stations loaded:', stations.length);
    document.getElementById('countStations').innerHTML = stations.length;
    return sortStationsByDepartment(stations);
}

const getMaxPowerByStation = (station) => {
    let maxPower = 0
    for (const connector of station.connectorStatusAcc) {
        if(connector.power > maxPower) maxPower = connector.power;
    }
    return maxPower;
}
const getSelectedRadio = (radioName) => {
    const radios = document.getElementsByName(radioName)
    for (let i = 0; i < radios.length; i++) {
        if(radios[i].checked) return radios[i].value;
    }
}

const getSelectedPower = () => {
    return getSelectedRadio('powerRadio');
}

const getSelectedConnector = () => {
    return getSelectedRadio('connectorRadio');
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

    const rowCount = table.rows.length;
    console.info('row count', rowCount)
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

    const map = new google.maps.Map(mapDiv, {
        zoom: DEFAULT_MAP_ZOOM,
        center: CENTER_URUGUAY,
    });
    for (const station of stations) {
        createMapMarker(station, map);
    }
}