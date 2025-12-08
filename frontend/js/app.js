/**
 * AIRVIEWER JS: Lógica Principal para la Interfaz Web (Frontend)
 */

// =======================================================
// 1. CONFIGURACIÓN Y DECLARACIONES GLOBALES
// =======================================================

// 🛑 IMPORTANTE: Esta URL DEBE ser tu URL de Render
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
// 2. FUNCIONES BASE Y UTILIDADES
// =======================================================

function showModule(targetModuleId, activeNavId) {
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

function draw24hTrendChart(data) {
    if (trendChart) trendChart.destroy();
    
    const newCanvas = document.getElementById('chart-24h');
    if (!newCanvas) return;
    
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
                y: { beginAtZero: false, min: 50, max: 120 },
                x: { display: true } 
            },
            animation: false 
        }
    });
}

function initializeMap(lat, lng, aqi) {
    const mapElement = 'map-container';
    
    if (myMap) { 
        myMap.remove(); 
        myMap = null; 
    }
    
    myMap = L.map(mapElement).setView([lat, lng], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(myMap);
    
    const details = getAqiAlertDetails(aqi);
    const colorCode = {
        'aqi-buena': 'green', 'aqi-moderada': 'orange', 'aqi-sensible': 'darkorange',
        'aqi-insalubre': 'red', 'aqi-muy-insalubre': 'purple', 'aqi-peligrosa': 'black'
    };

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

    setTimeout(function() {
        if (myMap) myMap.invalidateSize();
    }, 400); 

    const loadingText = document.querySelector(`#${mapElement} p`);
    if (loadingText) loadingText.style.display = 'none';
}

function drawIndicatorChart(title, data, labels, color, type = 'bar') {
    const ctx = document.getElementById('indicator-chart-canvas').getContext('2d');
    if (indicatorChart) indicatorChart.destroy();

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
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true }
            },
            plugins: {
                title: { display: true, text: title }
            }
        }
    });
}

function drawPredictionChart(predData, historyData) {
    const ctx = document.getElementById('chart-prediction').getContext('2d');
    if (predictionChart) predictionChart.destroy();

    const historyAqi = historyData.map(item => item.aqi);
    const predLabels = predData.map(item => item.time_h + 'h');
    const predAqi = predData.map(item => item.pred_aqi);

    predictionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: predLabels,
            datasets: [
                {
                    label: 'Datos Históricos (últimas 24h)',
                    data: historyAqi.slice(-24), // Últimos 24 reales
                    borderColor: '#198754',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.3,
                },
                {
                    label: 'AQI Predicción (24h)',
                    data: predAqi,
                    borderColor: '#0d6efd',
                    borderWidth: 2,
                    borderDash: [5, 5], // Línea punteada
                    fill: false,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: false, min: 50 },
            },
            animation: false
        }
    });
}

function drawSourcesChart(sourcesData) {
    const ctx = document.getElementById('chart-sources').getContext('2d');
    if (sourcesChart) sourcesChart.destroy();

    sourcesChart = new Chart(ctx, {
        type: 'doughnut', // Gráfica de dona
        data: {
            labels: sourcesData.labels, // Ej: ["Tráfico", "Industria", ...]
            datasets: [{
                data: sourcesData.contributions, // Ej: [45, 25, 20, 10]
                backgroundColor: ['#dc3545', '#ffc107', '#198754', '#6f42c1'],
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' },
            },
            animation: false
        }
    });
}


// =======================================================
// 4. FUNCIONES DE CARGA PRINCIPALES
// =======================================================

function checkAndTriggerAlerts(aqi) {
    const aqiNum = parseInt(aqi);

    // 🛑 Condición de Alerta de Audio (Si es insalubre) 🛑
    if (aqiNum >= 151) {
        console.warn("Nivel de AQI insalubre detectado. Activando alerta de audio.");

        // 1. Alerta de Audio (ASUMIMOS que tienes este archivo en frontend/sounds/alerta.mp3)
        const audio = new Audio('sounds/alerta.mp3'); 
        audio.play().catch(e => console.error("Fallo al reproducir audio:", e)); 
        
        // 2. Alerta de Vibración (Solo funciona en dispositivos móviles)
        if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200]); 
        }
    }
}

async function loadRealTimeData() {
    try {
        const response = await fetch(`${API_BASE_URL}/data/current`);
        const data = await response.json(); 
        
        const currentAqi = data.aqi.toFixed(0);
        
        updateAqiCard(currentAqi); 
        checkAndTriggerAlerts(currentAqi); // <-- 🛑 VERIFICACIÓN DE SONIDO/VIBRACIÓN 🛑
        
        document.getElementById('last-update-time').textContent = new Date().toLocaleTimeString();
        document.getElementById('val-pm25').textContent = data.pm25.toFixed(1);
        document.getElementById('val-pm10').textContent = data.pm10.toFixed(1); 
        document.getElementById('val-no2').textContent = data.no2.toFixed(1);
        document.getElementById('val-co').textContent = data.co.toFixed(1);
        
        try {
            const trendResponse = await fetch(`${API_BASE_URL}/data/last_24h`);
            const trendData = await trendResponse.json(); 
            draw24hTrendChart(trendData);
            
            const lat = -8.1102; 
            const lng = -79.0238; 
            initializeMap(lat, lng, currentAqi);
            
        } catch(graphicError) {
            console.error('ADVERTENCIA: Falló el dibujo de gráfico/mapa, pero los datos principales son OK.', graphicError);
        }

    } catch (error) {
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

        const historyResponse = await fetch(`${API_BASE_URL}/data/last_24h`);
        const historyData = await historyResponse.json();


        // Actualiza Métricas
        document.getElementById('metric-rmse').textContent = metricsData.rmse ? metricsData.rmse.toFixed(2) : 'N/A';
        document.getElementById('metric-r2').textContent = metricsData.r2 ? metricsData.r2.toFixed(2) : 'N/A'; 
        document.getElementById('model-name').textContent = metricsData.model_name || 'N/A';
        document.getElementById('last-trained').textContent = metricsData.last_trained || 'N/A';

        // Actualiza Resumen de Predicción (Pico)
        const peak = predData.reduce((max, current) => (current.pred_aqi > max.pred_aqi ? current : max), predData[0]);
        const peakAqi = peak.pred_aqi.toFixed(0);
        
        document.getElementById('pred-aqi-peak').textContent = peakAqi; // 🛑 FORMATO CORRECTO 🛑
        document.getElementById('pred-time').textContent = `mañana a las ${peak.time_h}:00h`;
        
        const peakDetails = getAqiAlertDetails(peak.pred_aqi);
        document.getElementById('dominant-pollutant').textContent = `${peakDetails.estado}`;
        
        // 🛑 APLICACIÓN DE COLOR DINÁMICO A LA TARJETA DE PREDICCIÓN 🛑
        const peakCard = document.getElementById('pred-peak-card'); 
        if (peakCard) {
            peakCard.classList.remove('bg-warning', 'text-dark', 'bg-success', 'bg-danger', 'bg-info', 'aqi-buena', 'aqi-moderada', 'aqi-sensible', 'aqi-insalubre', 'aqi-muy-insalubre', 'aqi-peligrosa');
            
            peakCard.classList.add(peakDetails.class);
            peakCard.classList.add('text-white'); 
            
            if (peakDetails.estado === 'Moderada') {
                peakCard.classList.remove('text-white');
                peakCard.classList.add('text-dark');
            }
        }

        // Alerta de Predicción (Se mantiene la lógica original)
        const alertContainer = document.getElementById('alert-prediccion-peligro');
        const alertMessage = {
            'No saludable': 'ADVERTENCIA: Se predice un AQI insalubre. Evite el ejercicio intenso al aire libre y use mascarilla N95.',
            'Muy no saludable': 'ALERTA ROJA: Se predice un nivel de riesgo muy alto. Permanezca en interiores y cierre ventanas.',
            'Peligrosa': 'EMERGENCIA: Nivel de contaminación peligroso. Evacúe a zonas con mejor calidad de aire si es posible.',
            'No saludable para grupos sensibles': 'Precaución: Grupos sensibles (niños, ancianos) deben limitar la actividad al aire libre.',
            default: 'La calidad del aire predicha es Buena o Moderada. No se requieren acciones especiales.'
            };

        const message = alertMessage[peakDetails.estado] || alertMessage.default;
        const alertClass = (peakDetails.estado === 'No saludable' || peakDetails.estado === 'Muy no saludable' || peakDetails.estado === 'Peligrosa') ? 'alert-danger' : 'alert-warning';
        
        if (alertContainer) {
            alertContainer.innerHTML = `<div class="alert ${alertClass} p-2 mt-2">${message}</div>`;
        }

        // Dibuja Gráficas
        drawPredictionChart(predData, historyData);
        drawSourcesChart(sourcesData); 

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

        // 1. Actualización de los 4 indicadores 
        const indAlcance = document.getElementById('ind-tpa-alcance');
        const indRespuesta = document.getElementById('ind-tpa-respuesta');
        const indPpe = document.getElementById('ind-ppe');
        const indPsc = document.getElementById('ind-psc');
        
        // Asignación de texto a los <p> dentro de los <a>
        indAlcance.querySelector('p').textContent = data.TPA_Alcance_Hrs.toFixed(2) + ' Hrs'; 
        indRespuesta.querySelector('p').textContent = data.TPA_Respuesta_Seg.toFixed(2) + ' Seg';
        indPpe.querySelector('p').textContent = data.PPE_Precision_Pct.toFixed(2) + ' %';
        indPsc.querySelector('p').textContent = data.PSC_Superacion_Pct.toFixed(2) + ' %';

        // 2. ASIGNAR EL EVENTO 'click' PARA VISUALIZACIÓN Y ALERTA (con info de Trujillo)
        
        // TPA Alcance: Gráfico de Tendencia de AQI
        indAlcance.onclick = () => {
            const labels = ['0h', '3h', '6h', '12h', '18h', '24h'];
            const trendData = [70, 75, 80, 85, 82, 79]; 
            drawIndicatorChart('TPA Alcance de Concentración (AQI)', trendData, labels, '#0d6efd', 'line');
            
            alert(`
                TPA Alcance: ${data.TPA_Alcance_Hrs.toFixed(2)} Hrs.
                ---
                INFO CIUDAD: Este tiempo es crítico. Las zonas con mayor riesgo de alta concentración son Trujillo Centro, El Porvenir y Salaverry (por actividades portuarias y tráfico pesado), afectando el tiempo promedio de alerta.
            `);
        };

        // TPA Respuesta: Gráfico de Barras Simple (Latencia)
        indRespuesta.onclick = () => {
            const labels = ['Latencia Mediana', 'Latencia Máxima'];
            const resData = [data.TPA_Respuesta_Seg, 5.0]; 
            drawIndicatorChart('TPA Respuesta (Latencia en Seg.)', resData, labels, '#ffc107', 'bar');

            alert(`
                TPA Respuesta: ${data.TPA_Respuesta_Seg.toFixed(2)} Segundos.
                ---
                INFO CIUDAD: Este indicador demuestra la velocidad de la red IoT. Los sensores están ubicados en áreas críticas como las inmediaciones del Mercado Hermelinda y puntos de congestión vehicular para garantizar una rápida respuesta.
            `);
        };

        // PPE Precisión: Gráfico de Precisión (Simulación de rangos)
        indPpe.onclick = () => {
            const labels = ['Precisión', 'Error'];
            const ppeData = [data.PPE_Precision_Pct, 100 - data.PPE_Precision_Pct]; 
            drawIndicatorChart('PPE Precisión de Zona Crítica (%)', ppeData, labels, ['#198754', '#dc3545'], 'doughnut');

            alert(`
                PPE Precisión: ${data.PPE_Precision_Pct.toFixed(2)} %.
                ---
                INFO CIUDAD: La precisión de zona crítica es alta. El modelo identifica con exactitud picos de riesgo en las zonas de quema de basura y áreas industriales ligeras alrededor de El Porvenir, Salaverry, Laredo y La Esperanza.
            `);
        };

        // PSC Superación: Gráfico de Barras (Superación de ECA)
        indPsc.onclick = () => {
            // 🛑 CORRECCIÓN: Incluir los 12 meses
            const labels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
            const pscData = [35, 48, 60, 55, 62, 70, 68, 65, 58, 52, 45, 40]; 
            
            drawIndicatorChart('PSC Superación de ECA (%)', pscData, labels, '#6f42c1', 'bar');
            
            alert(`
                PSC Superación: ${data.PSC_Superacion_Pct.toFixed(2)} %.
                ---
                INFO CIUDAD: Más del 48% de los registros superan el Estándar de Calidad Ambiental (ECA). Los focos de mayor superación se concentran en Salaverry, Laredo, Moche y en las vías de acceso al Mercado Hermelinda, debido a emisiones de PM2.5 y PM10.
            `);
        };
        
    } catch (error) {
        console.error('Error al cargar indicadores de tesis:', error);
        document.getElementById('ind-tpa-alcance').querySelector('p').textContent = 'Error API';
    }
}

// =======================================================
// 6. FUNCIONES DE GESTIÓN Y CARGA DE TABLA (Implementación asumida)
// =======================================================

function renderHistoryTable(records) {
    historyTableBody.innerHTML = ''; 
    
    if (records.length === 0) {
        historyTableBody.innerHTML = '<tr><td colspan="6" class="text-center">No hay registros históricos en el rango seleccionado.</td></tr>';
        return;
    }
    
    records.forEach(record => {
        const row = historyTableBody.insertRow();
        const dateObj = new Date(record.timestamp);
        const formattedTime = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString();

        row.insertCell().textContent = formattedTime;
        row.insertCell().textContent = record.aqi.toFixed(0);
        row.insertCell().textContent = record.pm25.toFixed(1);
        row.insertCell().textContent = record.pm10.toFixed(1);
        row.insertCell().textContent = record.no2.toFixed(1);
        row.insertCell().textContent = record.co.toFixed(1);
    });
}

async function fetchHistoryData(startDate = null, endDate = null) {
    let url = `${API_BASE_URL}/history`;
    if (startDate && endDate) {
        url += `?start_date=${startDate}&end_date=${endDate}`;
    }

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('API response was not ok.');
        
        const data = await response.json();
        renderHistoryTable(data);
    } catch (error) {
        console.error('Error al cargar datos históricos:', error);
        historyTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error de comunicación con el Backend.</td></tr>';
    }
}

function handleSearchClick() {
    fetchHistoryData(); 
}

async function addRecord() {
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
                timestamp: timestamp,
                pm25: parseFloat(pm25),
                pm10: parseFloat(pm10)
            })
        });

        if (response.ok) {
            alert('Registro añadido con éxito.');
            fetchHistoryData(); 
            document.getElementById('input-timestamp').value = '';
            document.getElementById('input-pm25').value = '';
            document.getElementById('input-pm10').value = '';
        } else {
            throw new Error('Fallo al añadir registro');
        }
    } catch (error) {
        alert('Error al agregar el registro. Verifique el servidor.');
        console.error(error);
    }
}

async function deleteLastRecord() {
    if (!confirm("¿Está seguro de eliminar el último registro?")) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/history/record/last`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert('Último registro eliminado.');
            fetchHistoryData(); 
        } else {
            throw new Error('Fallo al eliminar registro');
        }
    } catch (error) {
        alert('Error al eliminar el registro. Verifique el servidor.');
        console.error(error);
    }
}

function handleDownload() {
    const url = `${API_BASE_URL}/history/download?start_date=${startDateInput.value}&end_date=${endDateInput.value}`;
    window.open(url, '_blank');
}


// 🛑 DEFINICIÓN DE FUNCIÓN FALTANTE: Carga de Módulo Histórico
function loadHistoryModule() {
    // 1. Cargar indicadores de tesis (para que los valores aparezcan al instante)
    loadThesisIndicators();
    
    // 2. Asignar Listeners de Histórico (CRÍTICO para que los botones funcionen)
    document.getElementById('btn-search').onclick = handleSearchClick; 
    document.getElementById('btn-download').onclick = handleDownload;
    document.getElementById('btn-add-record').onclick = addRecord;
    document.getElementById('btn-delete-last').onclick = deleteLastRecord;

    // 3. Cargar datos iniciales de la tabla
    fetchHistoryData(); 

    console.log("Módulo Histórico inicializado y listeners asignados.");
}


// =======================================================
// 7. INICIALIZACIÓN GLOBAL
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
                    loadHistoryModule();
                }
            }
        });
    });

    // Muestra el Dashboard por defecto al cargar
    showModule('dashboard-module', 'nav-dashboard');
    loadRealTimeData(); 
    
    // 🛑 LLAMADA INICIAL: Cargar el módulo Histórico al inicio para que los listeners existan.
    loadHistoryModule(); 
    
    // =======================================================
    // 🛑 Inicialización de Tooltips de Bootstrap (Final)
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl)
    })
    // =======================================================
});







