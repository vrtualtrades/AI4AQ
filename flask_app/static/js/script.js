// global variables for storing selected start and end dates and all current markers
var startDate = "2020-01-01"; // default start date
var endDate = "2020-12-31"; // default end date
var allMarkers = [];
let showColors = true;

// At the global level
let currentGraphType = 'category'; // Default to category graph
var activeMetric = 'pm2.5'; // This can be 'pm2.5' or 'pm10'



// store markers by color
var markersByColor = {
    salt_red: [],
    salt_orange: [],
    salt_green: [],
    salt_lightBlue: [],
    web_red: [],
    web_orange: [],
    web_green: [],
    web_lightBlue: [],
    dav_red: [],
    dav_orange: [],
    dav_green: [],
    dav_lightBlue: []
};

let colorStates = {
    red: true,
    orange: true,
    green: true,
    lightBlue: true,
    salt: true, // New
    web: true, // New
    dav: true, // New
};


//    turq: true, //#66cc99
//    lightorange: true, //#ff9966
//    purple: true //#9999cc



// Declare geojson layer variable globally
var geojsonLayer;
var centroidData;

var map; // Declare `map` globally
var dateSlider;

document.addEventListener('DOMContentLoaded', function() {
    map = initializeMap();
    loadCentroidData(() => {
        loadGeoJSONLayer(map);
    });
    fetchDateRangeAndInitializeSlider(map);
    updateButtonStyle('red');
    updateButtonStyle('orange');
    updateButtonStyle('green');
    updateButtonStyle('lightBlue');
    updateButtonStyle('salt');
    updateButtonStyle('web');
    updateButtonStyle('dav');
});



function initializeMap() {
    var map = L.map('mapid').setView([40.7608, -111.8910], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    map.createPane('markerPane').style.zIndex = 650;
    return map;
}

function fetchDateRangeAndInitializeSlider(map) {
    fetch('/api/date_range')
        .then(response => response.json())
        .then(data => {
            var dateArray = data.map(item => item.date);
            initializeDateSlider(dateArray, map);
            //document.addEventListener('DOMContentLoaded', function() {
            //    // Trigger click event on the first toggle button to activate PM2.5 on page load
        // Load sensors on start -- want to change this to present
        document.getElementById('updateSensorsButton').click();
            //});
        })
        .catch(error => console.error('Error fetching date range:', error));
}

function initializeDateSlider(dateArray, map) {
    // Initialize the dateSlider inside this function but use the global variable
    dateSlider = document.getElementById('date-slider');
    noUiSlider.create(dateSlider, {
        range: { 'min': 0, 'max': dateArray.length - 1 },
        start: [0, dateArray.length - 1],
        connect: true,
        step: 1,
        tooltips: true,
        format: {
            to: value => dateArray[Math.round(value)],
            from: value => value
        }
    });
}

function updateSensors(startDate, endDate, map) {
    clearMarkers();
    
    const url = `/api/summary_sensor?begin_date=${startDate}&end_date=${endDate}&red=${colorStates.red}&orange=${colorStates.orange}&green=${colorStates.green}&lightBlue=${colorStates.lightBlue}&salt=${colorStates.salt}&web=${colorStates.web}&dav=${colorStates.dav}`;

    fetch(url)
        .then(response => response.json())
        .then(data_sensor => {
            addSensorMarkers(data_sensor, map);
            calculateBarGraph(data_sensor);
            document.getElementById('sensorTitle').innerHTML = `<h4>${activeMetric} Levels <span style="font-size: smaller;">(between ${startDate} and ${endDate}</span>)</h4>`;
;
        })
        .catch(error => console.error('Error fetching sensor data:', error));
}



function addSensorMarkers(data_sensor, map) {
    data_sensor.forEach(sensor => {
        var color; // Determine color for sensor base

        // Assign color based on criteria
        if (sensor.county === 'Salt Lake County') {
            county = 'salt';
        } else if (sensor.county === 'Weber County') {
            county = 'web';
        } else if (sensor.county === 'Davis County') {
            county = 'dav';
        }
        
        if (sensor.category === 'red') {
            color = county + '_red';
        } else if (sensor.category === 'green') {
            color = county + '_green';
        } else if (sensor.category === 'orange') {
            color = county + '_orange';
        } else if (sensor.category === 'blue') {
            color = county + '_lightBlue';
        }

        // Construct the HTML for the marker
        var htmlContent = `<div class='custom-icon'>` +
                          `<img src="static/js/pin.png" style="width:46.2.5px; height:53.2px;">` +
                          `<span class='sensor-value'>${Math.round(sensor.avg_pm2)}</span>` +
                          `</div>`;

        // Create a divIcon with the HTML content
        var customIcon = L.divIcon({
            html: htmlContent,
            className: '', // This is important to override default Leaflet icon styles
            iconSize: [46.2, 53.2],
            iconAnchor: [16.5, 37], // Adjust on the size of icon
            popupAnchor: [0, -38] // Adjust to position the popup
        });
        
        // Create the marker with the custom icon and add to map
        var marker = L.marker([sensor.latitude, sensor.longitude], {icon: customIcon});
        marker.bindPopup(`<b>Sensor ID:</b> ${sensor.sensor_id}<br><b>PM2.5 Value:</b> ${Math.round(sensor.avg_pm2)}`);
        marker.sensorData = sensor;
        if (color) {
            markersByColor[color].push(marker); // Add marker to appropriate color category
            if (colorStates[county]==true & colorStates[sensor.category] ==true) { // Check if markers for this color should be displayed
                marker.addTo(map);
            }
        }
    });
}




function clearMarkers() {
    // Clear markers from each category
    Object.values(markersByColor).forEach(markersArray => {
        markersArray.forEach(marker => marker.remove());
        markersArray.length = 0; // Clear the array
    });
    // clear the allMarkers array if it's still in use for other purposes
    allMarkers.forEach(marker => marker.remove());
    allMarkers.length = 0;
}



// Function to get color based on lowmod_pct
    
function getColor(lowmod_pct) {
    if (!showColors) {
        return 'gray';
    }
    
    if (lowmod_pct > 0.75) {
        return 'red';
    } else if (lowmod_pct > 0.5) {
        return 'orange';
    } else if (lowmod_pct > 0.25) {
        return 'green';
    } else {
        return '#33ccff'; // Light blue
    }
}



function style(feature) {
    return {
        fillColor: getColor(feature.properties.Lowmod_pct),
        weight: 4,
        opacity: 1,
        color: 'white',  // Default border color
        dashArray: '3',
        fillOpacity: showColors ? 0.6 : 0.4
    };
}

function highlightFeature(e) {
    var layer = e.target;

    layer.setStyle({
        weight: 5,
        color: 'green',
        dashArray: '',
        fillOpacity: 0.7
    });

    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
        layer.bringToFront();
    }

    // Update info panel with properties
    var properties = layer.feature.properties;
    document.getElementById('info').innerHTML = 'Census Tract: ' + properties.Tract + '<br>Low Income: ' + properties.Low + '<br>Low/Moderate Income: ' + properties.Lowmod + '<br>Low/Mod Percentage: ' + properties.Lowmod_pct;
}

function resetHighlight(e) {
    geojsonLayer.resetStyle(e.target);
    document.getElementById('info').innerHTML = 'Census Tract: ' + '<br>Low Income: ' + '<br>Low/Moderate Income: ' +  '<br>Low/Mod Percentage: '
}

function onEachFeature(feature, layer) {
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight
    });
}

function loadGeoJSONLayer(map) {
    fetch('/static/data/converted_geojson_data.geojson')
        .then(response => response.json())
        .then(data => {
            geojsonLayer = L.geoJson(data, {
                style: style,
                onEachFeature: function(feature, layer) {
                    // Now pass `map` as the third argument
                    onEachFeature(feature, layer, map);
                }
            }).addTo(map);
        });
}

    

function calculateBarGraph(data_sensor) {
    // Clear existing SVG content
    d3.select("#my_dataviz svg").remove();

    let categories = [...new Set(data_sensor.map(item => item.category))];
    let firstCatAvgs = [];

    categories.forEach(category => {
        let firstEntry = data_sensor.find(item => item.category === category);
        if (firstEntry) {
            firstCatAvgs.push({
                category: category,
                cat_avg_pm2: firstEntry.cat_avg_pm2,
                cat_avg_pm10: firstEntry.cat_avg_pm10
            });
        }
    });

    var data = firstCatAvgs;
    

    var margin = {top: 20, right: 30, bottom: 40, left: 40},
        width = 300 - margin.left - margin.right,
        height = 300 - margin.top - margin.bottom;

    var svg = d3.select("#my_dataviz")
      .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    
    // Adding the title
    svg.append("text")
        .attr("x", (width / 2))
        .attr("y", 0 - (margin.top / 2)) // Positioning the title at the top with some margin
        .attr("text-anchor", "middle")  // This ensures the text is centered at the given x position
        .style("font-size", "16px")
        .text("");

    // X axis
    var x = d3.scaleBand()
      .range([0, width])
      .domain(data.map(function(d) { return d.category; })) // Use 'category' instead of 'Country'
      .padding(0.2);
    svg.append("g")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(x))
      .selectAll("text")
        .attr("transform", "translate(-10,0)rotate(-45)")
        .style("text-anchor", "end");

    // Add Y axis
    var y = d3.scaleLinear()
      .domain([0, d3.max(data, function(d) { return d.cat_avg_pm2; })]) // Use 'cat_avg_pm2'
      .range([height, 0]);
    svg.append("g")
      .call(d3.axisLeft(y));

    var color = d3.scaleOrdinal()
      .domain(categories)
      .range(d3.schemeSet2);

    svg.selectAll(".bar")
      .data(data)
      .enter().append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.category)) // Position based on category
        .attr("width", x.bandwidth()) // Width as determined by scaleBand
        .attr("y", d => y(d.cat_avg_pm2)) // Y position based on cat_avg_pm2
        .attr("height", d => height - y(d.cat_avg_pm2)) // Height based on scale
        .attr("fill", function(d, i) {
            // Set fill color based on category
            // replace colors or a color scale function
            switch(d.category) {
                case "red": return "#d62728";
                case "orange": return "#ff7f0e";
                case "green": return "#2ca02c";
                default: return "#33ccff"; // Default color
            }
        });
}

// Function to toggle the sidebar
function toggleSidebar() {
    var sidebar = document.getElementById("sidebar");
    sidebar.classList.toggle("active");
}

var greenIcon = L.icon({
    iconUrl: 'static/js/pin.png',
    //shadowUrl: 'static/js/shadow.png',

    iconSize:     [30, 30], // size of the icon
    //shadowSize:   [100, 100], // size of the shadow
    iconAnchor:   [4, 8], // point of the icon which will correspond to marker's location
    //shadowAnchor: [50, 96],  // the same for the shadow
    popupAnchor:  [-3, -96] // point from which the popup should open relative to the iconAnchor
});



// Function to load centroids
function loadCentroidData(callback) {
    fetch('/static/data/centroids_data.geojson')
    .then(response => response.json())
    .then(data => {
        centroidData = data;
        if (typeof callback === "function") {
            callback(); // Call the callback function if it's provided
        }
    });
}

function getCentroidForObjectID(objectID) {

    const feature = centroidData.features.find(f => f.properties.OBJECTID === objectID);

    if (feature && feature.geometry && feature.geometry.coordinates) {
        console.log('Geometry Coordinates:', feature.geometry.coordinates);
        // Since geometry.coordinates is an array [lng, lat]
        const coords = feature.geometry.coordinates;
        
        return coords.length === 2 ? coords : null; // This check ensures that coords is an array with two elements.
    }
    return null;
}


function onEachFeature(feature, layer, map) {
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        click: function(e) {

            // Find the centroid for the clicked tract
            const centroid = getCentroidForObjectID(feature.properties.OBJECTID);

            // Inside click event handler
            if (centroid) {
                const latLng = new L.LatLng(centroid[1], centroid[0]); // Use the coordinates directly
                // Create and add the marker
                L.marker(latLng, {icon: greenIcon}).addTo(map)
                  .bindPopup(`<b>Sensor ID:</b> ${feature.properties.OBJECTID}<br><b>Info:</b> Additional info here`);
            }

        }
    });
}

document.getElementById('colorToggle').addEventListener('click', function() {
    showColors = !showColors; // Toggle the state

    updateMapColors();
});

function updateMapColors() {
    if (geojsonLayer) {
        geojsonLayer.eachLayer(function(layer) {
            var lowmod_pct = layer.feature.properties.Lowmod_pct; // Ensure this matches actual property name
            var newColor = showColors ? getColor(lowmod_pct) : 'gray'; // Use transparent color if showColors is false
            layer.setStyle({
                fillColor: newColor,
                fillOpacity: showColors ? 0.6 : 0.4,
                color: 'white', // This is outline color
                weight: 4, // This is the outline weight
                opacity: 1, // This controls the opacity of the outline
                // Keep other styles as they are or adjust as needed
            });
        });
    }
}


function updateButtonStyle(color) {
    const buttonId = `toggle${color.charAt(0).toUpperCase() + color.slice(1)}`;
    const button = document.getElementById(buttonId);

    if (colorStates[color]) {
        button.classList.add("active");
        button.classList.remove("inactive"); // Ensure this class is removed if it's used
        // Set button color based on the active state if needed
    } else {
        button.classList.remove("active");
        button.classList.add("inactive"); // Add this class if using it to style inactive buttons

    }
}



function toggleColorStateAndRefreshMap(color,theSplitType) {
    colorStates[color] = !colorStates[color]; // Toggle the state
    updateButtonStyle(color); // Update the button appearance

    // refresh the map or markers based on this new state, call those functions here
    toggleMarkersByColor(color, colorStates[color],theSplitType);
}



// Function to update dates globally
function updateDatesFromSlider() {
    let values = dateSlider.noUiSlider.get();
    startDate = values[0];
    endDate = values[1];
}

// Update sensor data based on current dates and map state
function refreshSensorData() {
    // Reset all color buttons to true/pushed state
    Object.keys(colorStates).forEach(color => {
        colorStates[color] = true; // Set each color state to true
        updateButtonStyle(color); // Update button styles to reflect the pushed state
    });

    updateDatesFromSlider();
    clearMarkers(); // Clear existing markers before fetching new data
    updateSensors(startDate, endDate, map); // Fetch and display new sensor data
}

// Call this function after loading new sensor data:
document.getElementById('updateSensorsButton').addEventListener('click', function() {
    resetButtonStates(); // Ensure this is called to reset states as needed
    refreshSensorData(); // Load new data and refresh UI accordingly
    
});


function toggleMarkersByColor(color, show,theSplitType) {
    
    
    if(theSplitType == 'color'){
        if (colorStates['salt'] == true){
            markersByColor['salt_' + color].forEach(marker => {
                if (show) {
                    marker.addTo(map);
                } else {
                    marker.remove();
                }
            })
        }
                                                    
        if (colorStates['web'] == true){
            markersByColor['web_' + color].forEach(marker => {
                if (show) {
                    marker.addTo(map);
                } else {
                    marker.remove();
                }
            })
        }
                                                   
       if (colorStates['dav'] == true){
           markersByColor['dav_' + color].forEach(marker => {
               if (show) {
                   marker.addTo(map);
               } else {
                   marker.remove();
               }
           })
       }
    }
    
    else {
        if (colorStates['red'] == true){
            markersByColor[color + '_red'].forEach(marker => {
                if (show) {
                    marker.addTo(map);
                } else {
                    marker.remove();
                }
            })
        }
        if (colorStates['lightBlue'] == true){
            markersByColor[color + '_lightBlue'].forEach(marker => {
                if (show) {
                    marker.addTo(map);
                } else {
                    marker.remove();
                }
            })
        }
        if (colorStates['green'] == true){
            markersByColor[color + '_green'].forEach(marker => {
                if (show) {
                    marker.addTo(map);
                } else {
                    marker.remove();
                }
            })
        }
        if (colorStates['orange'] == true){
            markersByColor[color + '_orange'].forEach(marker => {
                if (show) {
                    marker.addTo(map);
                } else {
                    marker.remove();
                }
            })
        }
        
    }
}

//// Function to clear arrays for keys that match a given string
//function clearArraysForMatch(string) {
//    // Find matching keys
//    const matchingKeys = Object.keys(markersByColor).filter(key => key.includes(string));
//
//    // Iterate over matching keys and clear their arrays
//    for (let key of matchingKeys) {
//        markersByColor[key] = []; // Clear the array
//    }
//
//    // For demonstration, returning the modified object to see the result
//    return markersByColor;
//}


document.getElementById('toggleRed').addEventListener('click', () => {
    toggleColorStateAndRefreshMap('red','color')
    updateJustGraph();
});
document.getElementById('toggleOrange').addEventListener('click', () => {
    toggleColorStateAndRefreshMap('orange','color')
    updateJustGraph();
});
document.getElementById('toggleGreen').addEventListener('click', () => {
    toggleColorStateAndRefreshMap('green','color')
    updateJustGraph();
});
document.getElementById('toggleLightBlue').addEventListener('click', () => {
    toggleColorStateAndRefreshMap('lightBlue','color')
    updateJustGraph();
});

// Example for one button, repeat for others
document.getElementById('toggleSalt').addEventListener('click', () => {
    // Toggle state
    toggleColorStateAndRefreshMap('salt','county')
    // Refresh graph based on current graph type
    updateJustGraph();
});

// Example for one button, repeat for others
document.getElementById('toggleWeb').addEventListener('click', () => {
    // Update button appearance
    toggleColorStateAndRefreshMap('web','county')
    // Refresh graph based on current graph type
    updateJustGraph();
});

// Example for one button, repeat for others
document.getElementById('toggleDav').addEventListener('click', () => {
    // Update button appearance
    toggleColorStateAndRefreshMap('dav','county')
    // Refresh graph based on current graph type
    updateJustGraph();
});



function resetButtonStates() {
    Object.keys(colorStates).forEach(color => {
        colorStates[color] = true; // Set each color state to true initially
        updateButtonStyle(color);
            // Trigger click event on the first toggle button to activate PM2.5 on page load
        document.getElementById('toggleButton1').click();

    });
}

function updateJustGraph() {
    let url;
    if (currentGraphType === 'category') {
        url = `/api/summary_sensor?begin_date=${startDate}&end_date=${endDate}&red=${colorStates.red}&orange=${colorStates.orange}&green=${colorStates.green}&lightBlue=${colorStates.lightBlue}&salt=${colorStates.salt}&web=${colorStates.web}&dav=${colorStates.dav}`;
    } else if (currentGraphType === 'county') {
        url =
            `/api/county_avg?begin_date=${startDate}&end_date=${endDate}&red=${colorStates.red}&orange=${colorStates.orange}&green=${colorStates.green}&lightBlue=${colorStates.lightBlue}&salt=${colorStates.salt}&web=${colorStates.web}&dav=${colorStates.dav}`;
    } else {
        console.error('Unknown graph type');
        return;
    }

    
    fetch(url)
        .then(response => response.json())
        .then(data_sensor => {
            if (currentGraphType === 'category') {
                calculateBarGraph(data_sensor);
            } else if (currentGraphType === 'county') {
                calculateCountyGraph(data_sensor);
            }
        })
        .catch(error => console.error('Error fetching sensor data:', error));
}

// BAR GRAPHS -------------------------------

function calculateBarGraph(data_sensor) {
    // Clear existing SVG content
    d3.select("#my_dataviz svg").remove();

    // Predefined order of categories from low to high
    const categoryOrder = ['red', 'orange', 'green', 'blue'];

    // Mapping of category to labels
    const categoryLabels = {
        red: 'Low',
        orange: 'Low/Med',
        green: 'Med',
        blue: 'High',
    };

    let categories = [...new Set(data_sensor.map(item => item.category))];
    let firstCatAvgs = categories.map(category => {
        let firstEntry = data_sensor.find(item => item.category === category);
        return {
            category: category,
            cat_avg_pm2: firstEntry.cat_avg_pm2,
            cat_avg_pm10: firstEntry.cat_avg_pm10
        };
    });

    // Sort data based on the predefined category order
    firstCatAvgs.sort((a, b) => categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category));

    var data = firstCatAvgs;

    var margin = {top: 40, right: 30, bottom: 50, left: 40},
        width = 320 - margin.left - margin.right,
        height = 320 - margin.top - margin.bottom;

    var svg = d3.select("#my_dataviz")
      .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    svg.append("text")
        .attr("x", (width / 2))
        .attr("y", 0 - (margin.top / 2))
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .text(`${activeMetric} Average at Income Level`);

    var x = d3.scaleBand()
      .range([0, width])
      .domain(data.map(d => categoryLabels[d.category]))
      .padding(0.2);
    svg.append("g")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(x))
      .selectAll("text")
        .attr("transform", "translate(10,0)rotate(0)")
        .style("text-anchor", "end");

    var yDomain = activeMetric === 'pm2.5' ? d3.max(data, d => d.cat_avg_pm2) : d3.max(data, d => d.cat_avg_pm10);
    var y = d3.scaleLinear()
      .domain([0, yDomain])
      .range([height, 0]);
    svg.append("g")
      .call(d3.axisLeft(y));

    var color = d3.scaleOrdinal()
      .domain(categories)
      .range(d3.schemeSet2);

    svg.selectAll(".bar")
      .data(data)
      .enter().append("rect")
        .attr("class", "bar")
        .attr("x", d => x(categoryLabels[d.category]))
        .attr("width", x.bandwidth())
        .attr("y", d => y(activeMetric === 'pm2.5' ? d.cat_avg_pm2 : d.cat_avg_pm10))
        .attr("height", d => height - y(activeMetric === 'pm2.5' ? d.cat_avg_pm2 : d.cat_avg_pm10))
        .attr("fill", d => {
            switch(d.category) {
                case "red": return "#d62728";
                case "orange": return "#ff7f0e";
                case "green": return "#2ca02c";
                default: return "#33ccff"; // Default color
            }
        });
}



// County Graph
function calculateCountyGraph(data_sensor) {
    // Clear existing SVG content
    d3.select("#my_dataviz svg").remove();

    let uniqueCountyData = Array.from(new Set(data_sensor.map(item => item.county)))
        .map(county => {
            let firstEntryInCounty = data_sensor.find(item => item.county === county);
            return {
                county: county,
                county_avg_pm2: firstEntryInCounty.cat_avg_pm2,
                county_avg_pm10: firstEntryInCounty.cat_avg_pm10
            };
        });

    var data = uniqueCountyData;

    var margin = {top: 40, right: 40, bottom: 50, left: 40},
        width = 320 - margin.left - margin.right,
        height = 320 - margin.top - margin.bottom;

    var svg = d3.select("#my_dataviz")
      .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    
    svg.append("text")
        .attr("x", (width / 2))
        .attr("y", 0 - (margin.top / 2))
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .text(`${activeMetric}  Average at County Level`);

    var x = d3.scaleBand()
      .range([0, width])
      .domain(data.map(d => d.county))
      .padding(0.2);
    svg.append("g")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(x))
      .selectAll("text")
        .attr("transform", "translate(14,0)rotate(0)")
        .style("text-anchor", "end");

    var yDomain = activeMetric === 'pm2.5' ? d3.max(data, d => d.county_avg_pm2) : d3.max(data, d => d.county_avg_pm10);
    var y = d3.scaleLinear()
      .domain([0, yDomain])
      .range([height, 0]);
    svg.append("g")
      .call(d3.axisLeft(y));

    var color = d3.scaleOrdinal()
      .domain(uniqueCountyData.map(d => d.county))
      .range(d3.schemeSet2);
    console.log(activeMetric)
    svg.selectAll(".bar")
      .data(data)
      .enter().append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.county))
        .attr("width", x.bandwidth())
        .attr("y", d => y(activeMetric === 'pm2.5' ? d.county_avg_pm2 : d.county_avg_pm10))
        .attr("height", d => height - y(activeMetric === 'pm2.5' ? d.county_avg_pm2 : d.county_avg_pm10))
        .attr("fill", (d) => {
            switch(d.county) {
                case "Salt Lake County": return "#66cc99";
                case "Weber County": return "#ff9966";
                default: return "#9999cc";
            }
        });
}


function updateGraph(graphType) {
    // Determine the URL based on graph type
    let url;
    if (graphType === 'category') {
        url = `/api/summary_sensor?begin_date=${startDate}&end_date=${endDate}&red=${colorStates.red}&orange=${colorStates.orange}&green=${colorStates.green}&lightBlue=${colorStates.lightBlue}&salt=${colorStates.salt}&web=${colorStates.web}&dav=${colorStates.dav}`;
    } else if (graphType === 'county') {
        url = `/api/county_avg?begin_date=${startDate}&end_date=${endDate}&red=${colorStates.red}&orange=${colorStates.orange}&green=${colorStates.green}&lightBlue=${colorStates.lightBlue}&salt=${colorStates.salt}&web=${colorStates.web}&dav=${colorStates.dav}`;
    } else {
        console.error('Invalid graph type specified');
        return;
    }

    // Fetch data and update the graph
    fetch(url)
        .then(response => response.json())
        .then(data_sensor => {
            if (graphType === 'category') {
                calculateBarGraph(data_sensor);
            } else if (graphType === 'county') {
                calculateCountyGraph(data_sensor); //county graph function
            }
        })
        .catch(error => console.error('Error fetching sensor data:', error));
}

// Add event listeners to buttons
document.getElementById('categoryGraphButton').addEventListener('click', function() {
    currentGraphType = 'category';
    updateGraph('category');
});

document.getElementById('countyGraphButton').addEventListener('click', function() {
    currentGraphType = 'county';
    updateGraph('county');
});

document.addEventListener('DOMContentLoaded', function() {
    // Function to toggle button states
    function toggleButtonStates(buttonId) {
        const button1 = document.getElementById('toggleButton1');
        const button2 = document.getElementById('toggleButton2');
        
        if (buttonId === 'toggleButton1') {
            button1.classList.add('btn-primary'); // Turn this button on
            button2.classList.remove('btn-primary'); // Turn the other button off
            button1.classList.remove('btn-info');
            button2.classList.add('btn-info');
        } else if (buttonId === 'toggleButton2') {
            button2.classList.add('btn-primary'); // Turn this button on
            button1.classList.remove('btn-primary'); // Turn the other button off
            button2.classList.remove('btn-info');
            button1.classList.add('btn-info');
        }
    }

    // Add event listeners to the buttons
    
    document.getElementById('toggleButton1').addEventListener('click', function() {
        activeMetric = 'pm2.5';
        toggleButtonStates('toggleButton1');
        updateGraph(currentGraphType);
        updateAllMarkerContents();
        document.getElementById('sensorTitle').innerHTML = `<h4>${activeMetric} Levels <span style="font-size: smaller;">(between ${startDate} and ${endDate}</span>)</h4>`;
        // Assume calculateCountyGraph is called with the data when the button is pressed
    });

    document.getElementById('toggleButton2').addEventListener('click', function() {
        activeMetric = 'pm10';
        toggleButtonStates('toggleButton2');
        updateGraph(currentGraphType);
        updateAllMarkerContents();
        document.getElementById('sensorTitle').innerHTML = `<h4>${activeMetric} Levels <span style="font-size: smaller;">(between ${startDate} and ${endDate}</span>)</h4>`;
        // Assume calculateCountyGraph is called with the data when the button is pressed
    });
});

function updateAllMarkerContents() {
    Object.keys(markersByColor).forEach(colorKey => {
        markersByColor[colorKey].forEach(marker => {
            let sensor = marker.sensorData; // Retrieve the stored sensor data
            let displayValue = activeMetric === 'pm2.5' ? sensor.avg_pm2 : sensor.avg_pm10;
            let displayValueRounded = Math.round(displayValue);
            // Construct the new HTML content for the marker
            var htmlContent = `<div class='custom-icon'>` +
                              `<img src="static/js/pin.png" style="width:46.2px; height:53.2px;">` +
                              `<span class='sensor-value'>${displayValueRounded}</span>` +
                              `</div>`;

            // Update the marker's icon
            var customIcon = L.divIcon({
                html: htmlContent,
                className: '',
                iconSize: [46.2, 53.2],
                iconAnchor: [16.5, 37],
                popupAnchor: [0, -38]
            });

            marker.setIcon(customIcon);

            // Optionally, update the popup content as well
            marker.bindPopup(`<b>Sensor ID:</b> ${sensor.sensor_id}<br><b>${activeMetric.toUpperCase()} Value:</b> ${displayValueRounded}`);
        });
    });
}

// On Load
document.addEventListener('DOMContentLoaded', function() {
    // Trigger click event on the first toggle button to activate PM2.5 on page load
    document.getElementById('toggleButton1').click();
});

function formatDateString(dateString) {
    const date = new Date(dateString);
    let month = (date.getMonth() + 1).toString().padStart(2, '0'); // getMonth() is zero-based
    let day = date.getDate().toString().padStart(2, '0');
    let year = date.getFullYear();
    return `${month}-${day}-${year}`;
}
