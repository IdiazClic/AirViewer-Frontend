/**
 * AIRVIEWER JS: Lógica Principal para la Interfaz Web (Frontend)
 * Este script gestiona la navegación, el consumo de la API de Backend (Python/Flask),
 * y la visualización de datos en gráficos y tablas, aplicando los rangos AQI del ECA.
 */

// =======================================================
// 1. CONFIGURACIÓN Y DECLARACIONES GLOBALES
// =======================================================

const API_BASE_URL = 'https://airviewer.onrender.com'; 
const navMap = {
    'nav-dashboard': 'dashboard-module',
    'nav-prediction': 'prediction-module',
    'nav-history': 'history-module'
};

const moduleSections = document.querySelectorAll('.module-content');
const navLinks = document.querySelectorAll('nav a');
const startDateInput = document.getElementById('start-date');
const endDateInput = document.getElementById('end-date');
const historyTableBody = document.querySelector('#history-table tbody');

let trendChart, predictionChart, sourcesChart; 
let myMap; // Para Leaflet


// =======================================================
// 2. FUNCIONES BASE (Asegura la definición al inicio)
// =======================================================

function showModule(targetModuleId, activeNavId) {
    // Código para mostrar/ocultar módulos (Resuelve el error de botones)
    moduleSections.forEach(section => {
        section.style.display = 'none';
    });
    
    const targetModule = document.getElementById(targetModuleId);
    if (targetModule) {
        targetModule.style.display = 'block';
    }

    navLinks.forEach(link => {
        link.classList.remove('active');
    });
    const activeLink = document.getElementById(activeNavId);
    if (activeLink) {
        activeLink.classList.add('active');
    }
}

function getAqiAlertDetails(aqi) {
    // Lógica basada en la tabla ECA de tu tesis
    if (aqi >= 301) {
        return { class: 'aqi-peligrosa', estado: 'Peligrosa', descripcion: 'Emergencia de salud pública.' }; 
    } else if (aqi >= 201) {
        return { class: 'aqi-muy-insalubre', estado: 'Muy no saludable', descripcion: 'Riesgo alto para todos.' }; 
    } else if (aqi >= 151) {
        return { class: 'aqi-insalubre', estado: 'No saludable', descripcion: 'Afecta a la mayoría de personas.' }; 
    } else if (aqi >= 101) {
        return { class: 'aqi-sensible', estado: 'No saludable para grupos sensibles', descripcion: 'Puede afectar a niños, ancianos, enfermos.' }; 
    } else if (aqi >= 51) {
        return { class: 'aqi-moderada', estado: 'Moderada', descripcion: 'Aceptable, pero puede afectar a sensibles.' }; 
    } else if (aqi >= 0) {
        return { class: 'aqi-buena', estado: 'Buena', descripcion: 'Sin riesgo para la salud.' }; 
    } else {
         return { class: 'bg-secondary', estado: 'Desconocido', descripcion: 'Datos fuera de rango.' };
    }
}

function updateAqiCard(aqi) {
    // Actualiza el color y texto del AQI
    const aqiNum = parseInt(aqi);
    const details = getAqiAlertDetails(aqiNum);
    const aqiCard = document.getElementById('aqi-global-status');

    aqiCard.classList.remove('bg-secondary', 'aqi-buena', 'aqi-moderada', 'aqi-sensible', 'aqi-insalubre', 'aqi-muy-insalubre', 'aqi-peligrosa');
    aqiCard.classList.add(details.class);
    
    document.getElementById('val-aqi').textContent = aqi;
    document.getElementById('estado-aqi').textContent = `${details.estado} (${details.descripcion})`;
}


// =======================================================
// 3. FUNCIONES DE VISUALIZACIÓN (Gráficas y Mapa)
// =======================================================

// AirViewer/frontend/js/app.js (Función draw24hTrendChart)

function draw24hTrendChart(data) {
    // 1. Destruye la instancia anterior
    if (trendChart) { 
        trendChart.destroy(); 
    }
    
    // 2. IDENTIFICAR Y ELIMINAR EL CANVAS ANTIGUO
    let oldCanvas = document.getElementById('chart-24h');
    if (oldCanvas) {
        oldCanvas.remove(); // Elimina el elemento HTML completamente
    }
    
    // 3. CREAR UN NUEVO CANVAS LIMPIO
    const newCanvas = document.createElement('canvas');
    newCanvas.id = 'chart-24h';
    
    // 4. Insertar el nuevo canvas en el contenedor
    // Buscamos el contenedor padre (donde se encuentra el título h5)
    const chartParent = document.querySelector('#dashboard-module .col-lg-6.mb-4 > .card');
    const titleElement = chartParent.querySelector('h5'); 
    
    // Lo insertamos después del título
    if (titleElement) {
        titleElement.after(newCanvas);
    } else {
        chartParent.appendChild(newCanvas); 
    }
    
    // 5. Dibuja el gráfico usando el nuevo contexto
    const ctx = newCanvas.getContext('2d');
    const labels = data.map(item => item.time);
    const aqiValues = data.map(item => item.aqi);

    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{ 
                label: 'AQI Histórico', 
                data: aqiValues, 
                borderColor: '#198754', 
                tension: 0.3, 
                fill: false, 
                borderWidth: 2
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            scales: {
                y: { min: 50, max: 120 },
                x: { display: false } // Ocultar etiquetas para limpiar la vista
            },
        }
    });
}

function initializeMap(lat, lng, aqi) {
    const mapElement = 'map-container';
    
    // 1. Destruir la instancia anterior
    if (myMap) { 
        myMap.remove(); 
        myMap = null; 
    }
    
    // 2. Inicializar el mapa
    myMap = L.map(mapElement).setView([lat, lng], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(myMap);
    
    // 3. Definir el color del marcador
    const details = getAqiAlertDetails(aqi);
    const colorCode = {
        'aqi-buena': 'green', 'aqi-moderada': 'orange', 'aqi-sensible': 'darkorange',
        'aqi-insalubre': 'red', 'aqi-muy-insalubre': 'purple', 'aqi-peligrosa': 'black'
    };

    // 4. Crear el marcador
    L.marker([lat, lng], {
        icon: L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color: ${colorCode[details.class] || 'gray'}; 
                   width: 15px; height: 15px; border-radius: 50%; border: 2px solid white;"></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        })
    })
    .addTo(myMap)
    .bindPopup(`<b>Estación Trujillo</b><br>AQI: ${aqi} (${details.estado})`).openPopup();

    // 🛑 LÍNEA CRÍTICA: Forzar el renderizado de Leaflet (Soluciona el mapa blanco)
    setTimeout(function() {
        if (myMap) myMap.invalidateSize();
    }, 400); 

    // Quitar el mensaje de "Cargando Mapa..."
    const loadingText = document.querySelector(`#${mapElement} p`);
    if (loadingText) loadingText.style.display = 'none';
}

function drawPredictionChart(predData, historyData) {
    // Gráfico de predicción
    const ctx = document.getElementById('chart-prediction').getContext('2d');
    
    // Preparar los datos
    const predValues = predData.map(item => item.pred_aqi);
    const historyValues = historyData.map(item => item.aqi); 
    const labels = historyData.map(item => item.time); 

    if (predictionChart) predictionChart.destroy(); 

    predictionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                // DATASET 1: HISTÓRICO (LÍNEA CONTINUA)
                {
                    label: 'AQI Histórico',
                    data: historyValues,
                    borderColor: '#0d6efd', 
                    borderWidth: 2,
                    fill: false,
                    tension: 0.1
                },
                // DATASET 2: PREDICCIÓN (LÍNEA PUNTEADA)
                {
                    label: 'AQI Predicción',
                    data: predValues,
                    borderColor: '#dc3545', 
                    borderDash: [5, 5], 
                    fill: false,
                    tension: 0.1
                }
            ]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            scales: { y: { min: 110, max: 160 } }
        }
    });
}

function drawSourcesChart(sourcesData) {
    // Gráfico de fuentes
    const ctx = document.getElementById('chart-sources').getContext('2d');
    const labels = sourcesData.map(s => s.name);
    const data = sourcesData.map(s => s.weight_percent);
    
    const colors = ['#0d6efd', '#ffc107', '#dc3545', '#6f42c1']; 
    if (sourcesChart) sourcesChart.destroy(); 

    sourcesChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{ data: data, backgroundColor: colors, hoverOffset: 4 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } } }
    });
}


// =======================================================
// 4. FUNCIONES DE CARGA PRINCIPALES
// =======================================================

async function loadRealTimeData() {
    try {
        const response = await fetch(`${API_BASE_URL}/data/current`);
        const data = await response.json(); 
        
        // 1. Actualización de Sensores y AQI (SE DEBE QUEDAR FIJO)
        updateAqiCard(data.aqi.toFixed(0)); 
        document.getElementById('last-update-time').textContent = new Date().toLocaleTimeString();
        document.getElementById('val-pm25').textContent = data.pm25.toFixed(1);
        document.getElementById('val-pm10').textContent = data.pm10.toFixed(1); 
        document.getElementById('val-no2').textContent = data.no2.toFixed(1);
        document.getElementById('val-co').textContent = data.co.toFixed(1);
        
        // 2. Ejecutar las funciones gráficas DENTRO DE UN TRY-CATCH (SOLUCIÓN DE ESTABILIDAD)
        try {
            const trendResponse = await fetch(`${API_BASE_URL}/data/last_24h`);
            const trendData = await trendResponse.json(); 
            draw24hTrendChart(trendData);
            
            const lat = -8.1102; 
            const lng = -79.0238; 
            initializeMap(lat, lng, data.aqi.toFixed(0));
            
        } catch(graphicError) {
            console.error('ADVERTENCIA: Falló el dibujo de gráfico/mapa, pero los datos principales son OK.', graphicError);
        }

    } catch (error) {
        // Este catch principal solo se ejecuta si la API principal falla
        console.error('Fallo total de comunicación con el Backend:', error); 
        updateAqiCard('--');
        document.getElementById('estado-aqi').textContent = 'Error de comunicación total.';
    }
}

async function loadPredictionData() {
    try {
        const predResponse = await fetch(`${API_BASE_URL}/prediction/next_24h`);
        const predData = await predResponse.json();

        const metricsResponse = await fetch(`${API_BASE_URL}/model/metrics`);
        const metricsData = await metricsResponse.json();
        
        const sourcesResponse = await fetch(`${API_BASE_URL}/prediction/sources`);
        const sourcesData = await sourcesResponse.json();

        // 🛑 NUEVO: Cargar datos históricos para la gráfica de comparación
        const historyResponse = await fetch(`${API_BASE_URL}/data/last_24h`);
        const historyData = await historyResponse.json();


        // Actualiza Métricas
        document.getElementById('metric-rmse').textContent = metricsData.rmse.toFixed(2);
        document.getElementById('metric-r2').textContent = metricsData.r_squared.toFixed(2);
        document.getElementById('model-name').textContent = metricsData.model_name;
        document.getElementById('last-trained').textContent = metricsData.last_trained;

        // Actualiza Resumen de Predicción (Pico)
        const peak = predData.reduce((max, current) => (current.pred_aqi > max.pred_aqi ? current : max), predData[0]);
        document.getElementById('pred-aqi-peak').textContent = peak.pred_aqi;
        document.getElementById('pred-time').textContent = `mañana a las ${peak.time_h}:00h`;
        
        const peakDetails = getAqiAlertDetails(peak.pred_aqi);
        document.getElementById('dominant-pollutant').textContent = `${peakDetails.estado}`;

        drawPredictionChart(predData, historyData);
        drawSourcesChart(sourcesData.sources);

    } catch (error) {
        console.error('Error al cargar datos de predicción:', error);
        document.getElementById('model-name').textContent = 'Error de conexión con el modelo.';
    }
}


// =======================================================
// 5. FUNCIONES DE HISTÓRICO E INDICADORES DE TESIS
// =======================================================

async function loadThesisIndicators() {
    try {
        const response = await fetch(`${API_BASE_URL}/thesis/indicators`);
        const data = await response.json();

        // Actualización de los 4 indicadores (Anexos 2, 3, 4, 5)
        document.getElementById('ind-tpa-alcance').textContent = data.TPA_Alcance_Hrs + ' Hrs'; 
        document.getElementById('ind-tpa-respuesta').textContent = data.TPA_Respuesta_Seg + ' Seg';
        document.getElementById('ind-ppe').textContent = data.PPE_Precision_Pct + ' %';
        document.getElementById('ind-psc').textContent = data.PSC_Superacion_Pct + ' %';

    } catch (error) {
        console.error('Error al cargar indicadores de tesis:', error);
        document.getElementById('ind-tpa-alcance').textContent = 'Error API';
    }
}

function loadHistoryModule() {
    // 1. Llama a la función para cargar los resultados de los indicadores de tesis
    loadThesisIndicators(); 
    
    // 2. Conexión de botones de Gestión de Datos
    document.getElementById('btn-add-record').onclick = addRecord;
    document.getElementById('btn-delete-last').onclick = deleteLastRecord;

    // 3. Asignar el evento al botón de Búsqueda
    document.getElementById('btn-search').onclick = () => {
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;
        if (!startDate || !endDate) { alert('Por favor, selecciona una fecha de inicio y una de fin.'); return; }
        fetchHistoryData(startDate, endDate);
    };

    // 4. Asignar el evento al botón de Descarga
    document.getElementById('btn-download').onclick = () => {
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;
        if (!startDate || !endDate) { alert('Por favor, selecciona una fecha de inicio y una de fin para descargar.'); return; }
        handleDownload(startDate, endDate);
    };
}

// =======================================================
// 5. FUNCIONES DE HISTÓRICO E INDICADORES DE TESIS
// =======================================================

// --- FUNCIÓN 1: BUSCAR DATOS (fetchHistoryData) ---
async function fetchHistoryData(startDate, endDate) {
    // 1. Mostrar mensaje de carga
    historyTableBody.innerHTML = '<tr><td colspan="6" class="text-center">Cargando datos...</td></tr>';
    
    try {
        // 2. Llamada al endpoint de Flask /history
        const response = await fetch(`${API_BASE_URL}/history?start_date=${startDate}&end_date=${endDate}`);
        const data = await response.json(); 

        // 3. Limpiar y verificar datos
        historyTableBody.innerHTML = '';
        
        if (data.length === 0) {
            historyTableBody.innerHTML = '<tr><td colspan="6" class="text-center">No se encontraron datos para el rango seleccionado.</td></tr>';
            return;
        }

        // 4. Llenar la tabla (Asegúrate que los índices de la tabla coincidan con el HTML: PM10 es la 4ta columna)
        data.forEach(item => {
            const row = historyTableBody.insertRow();
            row.insertCell().textContent = new Date(item.timestamp).toLocaleString();
            row.insertCell().textContent = item.aqi.toFixed(0);
            row.insertCell().textContent = item.pm25.toFixed(2);
            row.insertCell().textContent = item.pm10 ? item.pm10.toFixed(2) : '--'; // PM10
            row.insertCell().textContent = item.no2.toFixed(2);
            row.insertCell().textContent = item.co ? item.co.toFixed(2) : '--';
        });

    } catch (error) {
        console.error('Error al cargar datos históricos:', error);
        historyTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error de conexión con la API o datos inválidos.</td></tr>';
    }
}


// --- FUNCIÓN 2: DESCARGAR CSV (handleDownload) ---
function handleDownload(startDate, endDate) {
    const downloadUrl = `${API_BASE_URL}/history/download?start_date=${startDate}&end_date=${endDate}`;
    
    // Crear un elemento 'a' oculto para forzar la descarga del archivo del servidor
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', `AirViewer_Trujillo_Data_${startDate}_a_${endDate}.csv`); 
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert('Iniciando descarga de datos históricos...');
}


// --- FUNCIÓN 3: AGREGAR REGISTRO (addRecord) ---
async function addRecord() {
    // Obtener valores del formulario de gestión (asumo que se implementó el formulario en index.html)
    const timestamp = document.getElementById('input-timestamp').value;
    const pm25 = document.getElementById('input-pm25').value;
    const pm10 = document.getElementById('input-pm10').value;

    if (!timestamp || !pm25 || !pm10) {
        alert("Por favor, complete Fecha/Hora, PM2.5 y PM10.");
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/history/record`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                timestamp: new Date(timestamp).toISOString(), 
                pm25: pm25, 
                pm10: pm10 
            })
        });

        if (response.ok) {
            alert("Registro añadido con éxito.");
            // Recargar la tabla histórica y datos actuales para mostrar el cambio
            loadHistoryModule(); 
            loadRealTimeData(); 
        } else {
            alert("Fallo al agregar el registro.");
        }
    } catch (error) {
        console.error('Error al enviar POST:', error);
    }
}

// --- FUNCIÓN 4: ELIMINAR ÚLTIMO REGISTRO (deleteLastRecord) ---
async function deleteLastRecord() {
    if (!confirm("¿Está seguro de eliminar el último registro?")) return;

    try {
        const response = await fetch(`${API_BASE_URL}/history/record/last`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert("Último registro eliminado.");
            // Recargar la tabla histórica para reflejar el borrado
            loadHistoryModule(); 
            loadRealTimeData(); 
        } else {
            alert("Fallo al eliminar: Base de datos vacía o error del servidor.");
        }
    } catch (error) {
        console.error('Error al enviar DELETE:', error);
    }
}

// =======================================================
// 8. INICIALIZACIÓN GLOBAL
// =======================================================

document.addEventListener('DOMContentLoaded', () => {
    // Esto hace que los botones de navegación funcionen
    navLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault(); 
            const navId = event.target.id;
            const contentId = navMap[navId];
            
            if (contentId) {
                showModule(contentId, navId);

                if (contentId === 'dashboard-module') {
                    loadRealTimeData();
                } else if (contentId === 'prediction-module') {
                    loadPredictionData();
                } else if (contentId === 'history-module') {
                    // Inicializar listeners de botones y cargar indicadores de tesis
                    if (!document.getElementById('btn-search').onclick) {
                         loadHistoryModule();
                    }
                }
            }
        });
    });

    // Muestra el Dashboard por defecto al cargar
    showModule('dashboard-module', 'nav-dashboard');
    loadRealTimeData(); 

});
