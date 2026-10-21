import * as maplibregl from 'https://unpkg.com/maplibre-gl@^6.12.0/dist/maplibre-gl.mjs';

const map = new maplibregl.Map({
  container: 'map',
  minZoom: 2.5,
  center: [9.417221068266686, 50.73751843127343],
  maxZoom: 7,
  style: 'https://michaeljpincus.github.io/sound_basemap/basemap.json'
});

window.map = map;

function formatDate(dateString) {
    const date = new Date(dateString);

    const day = date.getDate();
    const month = date.toLocaleString("en-US", { month: "long" });
    const year = date.getFullYear();

    const suffix =
        day % 10 === 1 && day !== 11 ? "st" :
        day % 10 === 2 && day !== 12 ? "nd" :
        day % 10 === 3 && day !== 13 ? "rd" : "th";

    return `${month} ${day}${suffix}, ${year}`;
}


map.on('load', () => {
    map.addSource('tour_cities', {
    type: 'geojson',
    data: 'fixedgdf.geojson',
    generateId: true
    });

    map.addLayer({
    id: 'tour_cities',
    type: 'circle',
    source: 'tour_cities',
    paint: {
        'circle-radius': 7,
        'circle-color': [
            'match',
            ['get', 'Tour'],
            'The 1975 World Tour', '#ffffff',  // Red
            'I Like It When You Sleep Tour', '#fbb2e6',  // Blue
            'Music for Cars Tour',  '#fdff83',  // Green
            'At Their Very Best', '#bdbdff',
            'Still...At Their Very Best', '#594dfe', 
            'white'            // Default color for anything else
            ],
        'circle-opacity': .7
    }
    });

    // map.addLayer({
    // id: 'tour_cities_glow',
    // type: 'circle',
    // source: 'tour_cities',
    // paint: {
    //     'circle-radius': 25,

    //     'circle-color': [
    //         'match',
    //         ['get', 'Tour'],
    //         'The 1975 World Tour', '#ffffff',
    //         'I Like It When You Sleep Tour', '#fbb2e6',
    //         'Music for Cars Tour', '#fdff83',
    //         'At Their Very Best', '#bdbdff',
    //         'Still...At Their Very Best', '#594dfe',
    //         'white'
    //     ],

    //     'circle-opacity': 0.3,
    //     'circle-blur': 1
    // }
    // });

    let hoveredId = null;
    let selectedId = null;
    let clickPopup = null;

    const hoverPopup = new maplibregl.Popup({
    closeButton: false,
    closeOnClick: false
    });

    // Build the popup HTML in one place so hover and click match
    function popupHTML({ city, Date, Tour }) {
    return `
        <div class="city-popup">
        <h3 class="city-name">${city.toUpperCase()}</h3>
        <p class="city-tour">${Tour}</p>
        <p class="city-date">${formatDate(Date)}</p>
        </div>`;
    }

    function setSelected(id) {
    if (selectedId !== null) {
        map.setFeatureState({ source: 'tour_cities', id: selectedId }, { selected: false });
    }
    selectedId = id;
    if (id !== null) {
        map.setFeatureState({ source: 'tour_cities', id }, { selected: true });
    }
    }

    // HOVER
    map.on('mousemove', 'tour_cities', (e) => {
    if (e.features.length === 0) return;
    map.getCanvas().style.cursor = 'pointer';

    const feature = e.features[0];

    // Move the hover highlight from the old circle to the new one
    if (hoveredId !== null) {
        map.setFeatureState({ source: 'tour_cities', id: hoveredId }, { hover: false });
    }
    hoveredId = feature.id;
    map.setFeatureState({ source: 'tour_cities', id: hoveredId }, { hover: true });

    // Show the hover popup, unless this city already has a click popup open
    if (feature.id === selectedId) {
        hoverPopup.remove();
    } else {
        hoverPopup
        .setLngLat(feature.geometry.coordinates.slice())
        .setHTML(popupHTML(feature.properties))
        .addTo(map);
    }
    });

    map.on('mouseleave', 'tour_cities', () => {
    map.getCanvas().style.cursor = '';
    hoverPopup.remove();
    if (hoveredId !== null) {
        map.setFeatureState({ source: 'tour_cities', id: hoveredId }, { hover: false });
    }
    hoveredId = null;
    });

    // CLICK
    map.on('click', 'tour_cities', (e) => {
    const feature = e.features[0];

    hoverPopup.remove();
    if (clickPopup) clickPopup.remove();   // close the previous click popup
    setSelected(feature.id);               // keep this circle big and opaque

    const popup = new maplibregl.Popup()
        .setLngLat(feature.geometry.coordinates.slice())
        .setHTML(popupHTML(feature.properties))
        .addTo(map);

    // When the popup closes (X button or clicking the map), un-select the circle
    popup.on('close', () => {
        if (clickPopup === popup) {
        setSelected(null);
        clickPopup = null;
        }
    });

    clickPopup = popup;
    });

    // ---- TOUR TOGGLE CARDS ----
    const TOURS = [
        { name: 'The 1975 World Tour',            color: '#ffffff' },
        { name: 'I Like It When You Sleep Tour',  color: '#fbb2e6' },
        { name: 'Music for Cars Tour',            color: '#fdff83' },
        { name: 'At Their Very Best',             color: '#bdbdff' },
        { name: 'Still...At Their Very Best',     color: '#594dfe' }
    ];

    const activeTours = new Set([TOURS[0].name]);

    function applyTourFilter() {
        map.setFilter('tour_cities', [
            'in', ['get', 'Tour'], ['literal', [...activeTours]]
        ]);

        // Close any open popups so a hidden city never keeps a popup
        hoverPopup.remove();
        if (clickPopup) clickPopup.remove();
    }

    const legend = document.createElement('div');
    legend.id = 'tour-legend';

    TOURS.forEach(({ name, color }) => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'tour-card';
        card.setAttribute('aria-pressed', String(activeTours.has(name)));
        card.style.setProperty('--tour-color', color);
        card.innerHTML = `<span class="tour-swatch"></span><span class="tour-label">${name}</span>`;

        card.addEventListener('click', () => {
            const isOn = activeTours.has(name);
            if (isOn) activeTours.delete(name);
            else activeTours.add(name);
            card.setAttribute('aria-pressed', String(!isOn));
            applyTourFilter();
        });

        legend.appendChild(card);
    });

    document.body.appendChild(legend);

    applyTourFilter();
    
});