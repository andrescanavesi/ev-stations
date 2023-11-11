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
    stations = stations.map((station) => station.map((connector) => connector.info = `${connector.count} de tipo ${connector.type} de ${connector.power}kw ${connector.hose ? 'con cable' : 'sin cable'}`))
    stations = stations.map((station) => station.countFastConnectors = countFastConnectorsByStation(station));
    // get only public stations
    stations = stations.filter((station) => station.chargeNetworkName === 'PUBLIC');
    console.info('public stations loaded:', stations.length);
    return sortStationsByDepartment(stations);
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
        cell6.innerHTML = station.info;

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