/**
 * AIRVIEWER JS: Lógica Principal para la Interfaz Web (Frontend)
 * Este script gestiona la navegación, el consumo de la API de Backend (Python/Flask),
 * y la visualización de datos en gráficos y tablas, aplicando los rangos AQI del ECA.
 */

// =======================================================
// 1. CONFIGURACIÓN Y DECLARACIONES GLOBALES
// =======================================================

// 🛑 IMPORTANTE: Esta URL DEBE ser tu URL de Render (ya que tu Backend está allí)
const API_BASE_URL = 'https://airviewer.onrender.com/api/v1'; 

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

let trendChart, predictionChart, sourcesChart, indicatorChart; 
let myMap; // Para Leaflet


// =======================================================
// 2. FUNCIONES BASE
// =======================================================

function showModule(targetModuleId, activeNavId) {
    // Código para mostrar/ocultar módulos
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
    const chartParent = document.querySelector('#aqi-chart-container'); 
    
    if (chartParent) {
        chartParent.innerHTML = ''; // Limpia el contenedor (Importante si el canvas es hijo directo)
        chartParent.appendChild(newCanvas); 
    } else {
        console.error("Contenedor #aqi-chart-container no encontrado.");
        return;
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
            maintainAspectRatio: false, // 🛑 CRÍTICO PARA USAR LA ALTURA FIJA DEL CSS
            scales: {
                y: { min: 50, max: 120 },
                x: { display: false } // Ocultar etiquetas para limpiar la vista
            },
            animation: false // Acelera el dibujo y evita fallos.
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

// 🛑 FUNCIÓN NUEVA: Dibuja Gráfica para Indicadores de Tesis
function drawIndicatorChart(title, data, labels, color, type = 'bar') {
    const ctx = document.getElementById('indicator-chart-canvas').getContext('2d');
    if (indicatorChart) indicatorChart.destroy();

    // Se asegura de que el contenedor tenga una altura visible (debe estar en el HTML/CSS)
    const container = document.getElementById('indicator-chart-container');
    if (container) container.style.height = '400px';

    indicatorChart = new Chart(ctx, {
        type: type, 
        data: {
            labels: labels,
            datasets: [{
                label: title,
                data: data,
                backgroundColor: color,
                borderColor: color,
                borderWidth: 1,
                fill: type === 'line' ? false : true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // CRÍTICO: Usa la altura fija del CSS
            scales: {
                y: { beginAtZero: true }
            },
            plugins: {
                title: { display: true, text: title }
            }
        }
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
        
        // 2. Ejecutar las funciones gráficas 
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

        // Cargar datos históricos para la gráfica de comparación
        const historyResponse = await fetch(`${API_BASE_URL}/data/last_24h`);
        const historyData = await historyResponse.json();


        // Actualiza Métricas
        document.getElementById('metric-rmse').textContent = metricsData.rmse ? metricsData.rmse.toFixed(2) : 'N/A';
        document.getElementById('metric-r2').textContent = metricsData.r_squared ? metricsData.r_squared.toFixed(2) : 'N/A';
        document.getElementById('model-name').textContent = metricsData.model_name;
        document.getElementById('last-trained').textContent = metricsData.last_trained;

        // Actualiza Resumen de Predicción (Pico)
        const peak = predData.reduce((max, current) => (current.pred_aqi > max.pred_aqi ? current : max), predData[0]);
        document.getElementById('pred-aqi-peak').textContent = peak.pred_aqi;
        document.getElementById('pred-time').textContent = `mañana a las ${peak.time_h}:00h`;
        
        const peakDetails = getAqiAlertDetails(peak.pred_aqi);
        document.getElementById('dominant-pollutant').textContent = `${peakDetails.estado}`;

        // Asume que los contenedores de las gráficas de predicción existen
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

        // 1. Actualización de los 4 indicadores (Se asume que los IDs existen en el HTML)
        const indAlcance = document.getElementById('ind-tpa-alcance');
        const indRespuesta = document.getElementById('ind-tpa-respuesta');
        const indPpe = document.getElementById('ind-ppe');
        const indPsc = document.getElementById('ind-psc');
        
        indAlcance.textContent = data.TPA_Alcance_Hrs.toFixed(2) + ' Hrs'; 
        indRespuesta.textContent = data.TPA_Respuesta_Seg.toFixed(2) + ' Seg';
        indPpe.textContent = data.PPE_Precision_Pct.toFixed(2) + ' %';
        indPsc.textContent = data.PSC_Superacion_Pct.toFixed(2) + ' %';

        // 2. 🛑 NUEVO: Asignar el evento 'click' para visualización
        
        // TPA Alcance: Gráfico de Tendencia de AQI
        indAlcance.onclick = () => {
            const labels = ['0h', '3h', '6h', '12h', '18h', '24h'];
            const trendData = [70, 75, 80, 85, 82, 79]; 
            drawIndicatorChart('TPA Alcance de Concentración (AQI)', trendData, labels, '#0d6efd', 'line');
        };

        // TPA Respuesta: Gráfico de Barras Simple (Simulación de Latencia)
        indRespuesta.onclick = () => {
            const labels = ['Latencia Mediana', 'Latencia Máxima'];
            const resData = [data.TPA_Respuesta_Seg, 5.0]; 
            drawIndicatorChart('TPA Respuesta (Latencia en Seg.)', resData, labels, '#ffc107', 'bar');
        };

        // PPE Precisión: Gráfico de Precisión (Simulación de rangos)
        indPpe.onclick = () => {
            const labels = ['Precisión', 'Error'];
            const ppeData = [data.PPE_Precision_Pct, 100 - data.PPE_Precision_Pct]; 
            drawIndicatorChart('PPE Precisión de Zona Crítica (%)', ppeData, labels, ['#198754', '#dc3545'], 'doughnut');
        };

        // PSC Superación: Gráfico de Barras (Simulación de meses)
        indPsc.onclick = () => {
            const labels = ['Ene', 'Feb', 'Mar', 'Abr'];
            const pscData = [35, 48, 60, 55]; // Simulación de superación de límites por mes
            drawIndicatorChart('PSC Superación de ECA (%)', pscData, labels, '#6f42c1', 'bar');
        };
        // 🛑 FIN DE CONEXIÓN DE CLIC
        
    } catch (error) {
        console.error('Error al cargar indicadores de tesis:', error);
        document.getElementById('ind-tpa-alcance').textContent = 'Error API';
    }
}

// Resto de funciones (fetchHistoryData, handleDownload, addRecord, deleteLastRecord)
// ... (Mantener las funciones originales de la sección 5 que no se modifican) ...
// (Se asume que estas funciones ya estaban en el código original)

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
                    // Asegurar que solo se carguen una vez
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

    // Carga inicial del módulo de Histórico/Indicadores (para que los listeners existan)
    loadHistoryModule(); 

});

