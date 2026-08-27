// =====================================================
// Firebase
// =====================================================

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";

import {
    getDatabase,
    ref,
    onValue
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";


// =====================================================
// Firebase Configuration
// =====================================================

const firebaseConfig = {

    apiKey:
        "AIzaSyBZCUh0-0izXwmoGOw6BiULwa7c37z4s1U",

    authDomain:
        "rackroom-6e221.firebaseapp.com",

    databaseURL:
        "https://rackroom-6e221-default-rtdb.asia-southeast1.firebasedatabase.app",

    projectId:
        "rackroom-6e221",

    storageBucket:
        "rackroom-6e221.firebasestorage.app",

    messagingSenderId:
        "186466867821",

    appId:
        "1:186466867821:web:51899ae4456052dc6abd64",

    measurementId:
        "G-68QF26T6GP"
};


// =====================================================
// Initialize Firebase
// =====================================================

const app = initializeApp(firebaseConfig);

const database = getDatabase(app);


// =====================================================
// Firebase Reference
// =====================================================

const racksRef = ref(
    database,
    "racks"
);


// =====================================================
// Variables
// =====================================================

let selectedRack = null;

let temperatureChart = null;

let humidityChart = null;

let historyDataForExcel = [];

let allRackData = {};

let historyListener = null;

let liveStatusInterval = null;

let currentFilterMode = "all";


// =====================================================
// Rack Card Server Icon
// =====================================================

const SERVER_ICON_SVG = `
<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="4" width="32" height="12" rx="2" fill="#3b4a63"/>
    <rect x="8" y="18" width="32" height="12" rx="2" fill="#2c3a52"/>
    <rect x="8" y="32" width="32" height="12" rx="2" fill="#3b4a63"/>
    <circle cx="14" cy="10" r="1.6" fill="#22c55e"/>
    <circle cx="14" cy="24" r="1.6" fill="#22c55e"/>
    <circle cx="14" cy="38" r="1.6" fill="#22c55e"/>
    <rect x="20" y="8.5" width="12" height="3" rx="1" fill="#8fa2c2"/>
    <rect x="20" y="22.5" width="12" height="3" rx="1" fill="#8fa2c2"/>
    <rect x="20" y="36.5" width="12" height="3" rx="1" fill="#8fa2c2"/>
</svg>
`;


// =====================================================
// DOM
// =====================================================

const overviewPage =
    document.getElementById("overviewPage");

const detailPage =
    document.getElementById("detailPage");

const rackGrid =
    document.getElementById("rackGrid");

const backToOverview =
    document.getElementById("backToOverview");


// =====================================================
// Firebase Connection Status
// =====================================================

const connectionDot =
    document.getElementById("connectionDot");

const connectionText =
    document.getElementById("connectionText");


// =====================================================
// Firebase Connection Test
// =====================================================

const connectedRef =
    ref(database, ".info/connected");

onValue(
    connectedRef,

    (snapshot) => {

        const connected =
            snapshot.val() === true;

        console.log(
            "Firebase Connected:",
            connected
        );

        if (connectionDot) {

            connectionDot.classList.remove(
                "online",
                "offline"
            );

            connectionDot.classList.add(
                connected
                    ? "online"
                    : "offline"
            );
        }

        if (connectionText) {

            connectionText.textContent =
                connected
                    ? "เชื่อมต่อ Firebase แล้ว"
                    : "Firebase Offline";
        }
    },

    (error) => {

        console.error(
            "Firebase Connection Error:",
            error
        );

        if (connectionText) {

            connectionText.textContent =
                "Firebase Error";
        }
    }
);


// =====================================================
// Read ALL Racks
// =====================================================

console.log(
    "กำลังอ่าน Firebase path: /racks"
);

onValue(

    racksRef,

    (snapshot) => {

        console.log(
            "Firebase snapshot:",
            snapshot
        );


        const data =
            snapshot.val();


        console.log(
            "Firebase /racks data:",
            data
        );


        // =================================================
        // No Data
        // =================================================

        if (!data) {

            console.warn(
                "ไม่พบข้อมูลที่ /racks"
            );

            allRackData = {};

            updateSummary({});

            rackGrid.innerHTML = `
                <div class="empty-state">
                    ไม่พบข้อมูล Rack ใน Firebase
                    <br><br>
                    <small>
                        กรุณาตรวจสอบ Firebase path /racks
                    </small>
                </div>
            `;

            return;
        }


        // =================================================
        // Save Data
        // =================================================

        allRackData = data;


        // =================================================
        // Update Summary
        // =================================================

        updateSummary(data);


        // =================================================
        // Render Overview
        // =================================================

        renderRackOverview(data);


        // =================================================
        // Update Selected Rack
        // =================================================

        if (selectedRack) {

            const rackData =
                data[selectedRack];


            if (rackData) {

                updateDetailData(
                    selectedRack,
                    rackData
                );
            }
        }


        // =================================================
        // เริ่มตรวจสอบสถานะแบบ Real-time
        // (ให้ Online/Offline/Alert อัปเดตตามเวลาจริง
        //  แม้ Firebase จะไม่มีข้อมูลใหม่เข้ามาก็ตาม)
        // =================================================

        startLiveStatusInterval();
    },


    (error) => {

        console.error(
            "Rack Firebase Error:",
            error
        );


        rackGrid.innerHTML = `
            <div class="empty-state">

                <strong>
                    Firebase Error
                </strong>

                <br><br>

                ${error.message}

            </div>
        `;
    }
);


// =====================================================
// Update Summary
// =====================================================

function updateSummary(racks)
{

    const rackEntries =
        Object.entries(racks);


    let online = 0;

    let offline = 0;

    let alert = 0;


    rackEntries.forEach(
        ([rackID, rackData]) => {

            const current =
                rackData?.current || {};

            const status =
                rackData?.status || {};


            const temperature =
                toNumber(
                    current.temperature
                );


            const humidity =
                toNumber(
                    current.humidity
                );


            const environment =
                getEnvironmentStatus(
                    temperature,
                    humidity
                );


            const isOnline =
                checkRackOnline(
                    status.lastUpdate
                );


            if (isOnline) {

                online++;

            } else {

                offline++;
            }


            if (
                !isOnline ||
                environment.level === "BAD" ||
                status.sensor !== "OK" ||
                status.wifi !== "OK"
            ) {

                alert++;
            }
        }
    );


    setText(
        "totalRack",
        rackEntries.length
    );


    setText(
        "onlineRack",
        online
    );


    setText(
        "offlineRack",
        offline
    );


    setText(
        "alertRack",
        alert
    );


    console.log(
        `📊 Summary @ ${new Date().toLocaleTimeString()} → online: ${online}, offline: ${offline}, alert: ${alert}`
    );
}


// =====================================================
// Live Status Interval
// -----------------------------------------------------
// สถานะ Online/Offline/Alert คำนวณจากเวลาที่ผ่านไป
// นับจาก lastUpdate (ดู checkRackOnline) ซึ่งเปลี่ยนแปลง
// ไปเรื่อย ๆ ตามเวลาจริง แม้ Firebase จะไม่ส่งข้อมูลใหม่
// เข้ามา ถ้าคำนวณเฉพาะตอนที่ onValue() ยิง event เท่านั้น
// ตัวเลข Alert/Online/Offline จะ "ค้าง" ค่าล่าสุดไว้ทันที
// ที่ sensor หยุดส่งข้อมูล ทั้งที่จริง ๆ ควรกลายเป็น
// Offline/Alert แล้ว จึงต้องคำนวณซ้ำเป็นระยะด้วย
// setInterval โดยใช้ allRackData ที่แคชไว้ล่าสุด
// =====================================================

function startLiveStatusInterval()
{

    if (liveStatusInterval) {

        return;
    }


    liveStatusInterval = setInterval(
        () => {

            if (
                !allRackData ||
                Object.keys(allRackData).length === 0
            ) {

                return;
            }


            console.log(
                "🔄 Live status tick:",
                new Date().toLocaleTimeString()
            );


            updateSummary(allRackData);

            renderRackOverview(allRackData);


            if (
                selectedRack &&
                allRackData[selectedRack]
            ) {

                updateDetailData(
                    selectedRack,
                    allRackData[selectedRack]
                );
            }
        },

        2000
    );
}


// =====================================================
// Render Rack Overview
// =====================================================

function renderRackOverview(racks)
{

    rackGrid.innerHTML = "";


    Object.entries(racks).forEach(
        ([rackID, rackData]) => {

            const card =
                createRackCard(
                    rackID,
                    rackData
                );


            rackGrid.appendChild(card);
        }
    );


    // =================================================
    // การ์ดถูกสร้างใหม่ทั้งหมดทุกครั้งที่ render
    // (รวมถึงตอน live interval ทำงานทุก 2 วิ) จึงต้อง
    // ใช้ filter ที่ผู้ใช้เลือกไว้ล่าสุดซ้ำ ไม่งั้นการ์ด
    // ที่ถูกซ่อนไว้จะโผล่กลับมาหมดหลัง re-render
    // =================================================

    filterRacks(
        currentFilterMode
    );
}


// =====================================================
// Create Rack Card
// =====================================================

function createRackCard(
    rackID,
    rackData
)
{

    const current =
        rackData?.current || {};


    const status =
        rackData?.status || {};


    const temperature =
        toNumber(
            current.temperature
        );


    const humidity =
        toNumber(
            current.humidity
        );


    const environment =
        getEnvironmentStatus(
            temperature,
            humidity
        );


    const online =
        checkRackOnline(
            status.lastUpdate
        );


    const sensorOK =
        status.sensor === "OK";


    const wifiOK =
        status.wifi === "OK";


    let overallStatus =
        "GOOD";


    let overallClass =
        "online-good";


    // =================================================
    // Offline
    // =================================================

    if (!online) {

        overallStatus =
            "OFFLINE";

        overallClass =
            "offline";
    }


    // =================================================
    // Sensor Error
    // =================================================

    else if (!sensorOK) {

        overallStatus =
            "SENSOR ERROR";

        overallClass =
            "alarm";
    }


    // =================================================
    // WiFi Error
    // =================================================

    else if (!wifiOK) {

        overallStatus =
            "WIFI ERROR";

        overallClass =
            "alarm";
    }


    // =================================================
    // Environment Bad
    // =================================================

    else if (
        environment.level === "BAD"
    ) {

        overallStatus =
            "ALERT";

        overallClass =
            "alarm";
    }


    // =================================================
    // Normal
    // =================================================

    else if (
        environment.level === "NORMAL"
    ) {

        overallStatus =
            "NORMAL";

        overallClass =
            "warning";
    }


    // =================================================
    // Create Card
    // =================================================

    const card =
        document.createElement("div");


    card.className =
        `rack-card ${overallClass}`;


    const envLabel =
        environment.level === "BAD"
            ? "ALERT"
            : environment.level;


    card.innerHTML = `

        <div class="rack-card-top">

            <div class="rack-icon">
                ${SERVER_ICON_SVG}
            </div>

            <div class="rack-card-title">

                <h3>
                    ${rackID}
                </h3>

                <p>
                    ${
                        online
                            ? "Online"
                            : "Offline"
                    }
                </p>

            </div>

        </div>


        <div class="rack-online">

            <span
                class="dot ${
                    online
                        ? "online"
                        : "offline"
                }"
            ></span>

            ${
                online
                    ? "Connected to Firebase"
                    : "Disconnected"
            }

        </div>


        <div class="rack-mini-cards">

            <div class="card card-mini ${environment.className}">

                <div class="card-header">
                    <span class="card-title">Temp</span>
                </div>

                <div class="card-body">

                    <div class="status-box">
                        <span class="status-label">status:</span>
                        <span class="status-value">${envLabel}</span>
                    </div>

                    <div class="value-box">
                        <span class="number">
                            ${
                                Number.isFinite(temperature)
                                    ? temperature.toFixed(1)
                                    : "--"
                            }
                        </span>
                        <span class="unit">°c</span>
                    </div>

                </div>

            </div>


            <div class="card card-mini ${environment.className}">

                <div class="card-header">
                    <span class="card-title">Humidity</span>
                </div>

                <div class="card-body">

                    <div class="status-box">
                        <span class="status-label">status:</span>
                        <span class="status-value">${envLabel}</span>
                    </div>

                    <div class="value-box">
                        <span class="number">
                            ${
                                Number.isFinite(humidity)
                                    ? humidity.toFixed(1)
                                    : "--"
                            }
                        </span>
                        <span class="unit">%</span>
                    </div>

                </div>

            </div>

        </div>


        <span class="rack-status" style="display:none;">
            ${overallStatus}
        </span>


        <button class="view-rack">

            View Details →

        </button>

    `;


    // =================================================
    // Open Detail
    // =================================================

    card.addEventListener(
        "click",
        () => {

            openRackDetail(
                rackID
            );
        }
    );


    const button =
        card.querySelector(
            ".view-rack"
        );


    button.addEventListener(
        "click",
        (event) => {

            event.stopPropagation();

            openRackDetail(
                rackID
            );
        }
    );


    return card;
}


// =====================================================
// Open Rack Detail
// =====================================================

function openRackDetail(rackID)
{

    selectedRack =
        rackID;


    overviewPage.style.display =
        "none";


    detailPage.style.display =
        "block";


    const rackData =
        allRackData[rackID];


    if (!rackData) {

        console.warn(
            "ไม่พบ Rack:",
            rackID
        );

        return;
    }


    updateDetailData(
        rackID,
        rackData
    );


    loadRackHistory(
        rackID
    );
}


// =====================================================
// Update Detail
// =====================================================

function updateDetailData(
    rackID,
    rackData
)
{

    console.log(
        `Updating detail: ${rackID}`,
        rackData
    );


    const current =
        rackData?.current || {};


    const status =
        rackData?.status || {};


    const temperature =
        toNumber(
            current.temperature
        );


    const humidity =
        toNumber(
            current.humidity
        );


    // =================================================
    // Title
    // =================================================

    setText(
        "detailRackTitle",
        rackID
    );


    // =================================================
    // Temperature
    // =================================================

    setText(
        "temperature",

        Number.isFinite(
            temperature
        )
            ? temperature.toFixed(1)
            : "--"
    );


    // =================================================
    // Humidity
    // =================================================

    setText(
        "humidity",

        Number.isFinite(
            humidity
        )
            ? humidity.toFixed(1)
            : "--"
    );


    // =================================================
    // Environment
    // =================================================

    const environment =
        getEnvironmentStatus(
            temperature,
            humidity
        );


    setStatusElement(
        "temperatureStatus",
        environment
    );


    setStatusElement(
        "humidityStatus",
        environment
    );


    // =================================================
    // Online
    // =================================================

    const online =
        checkRackOnline(
            status.lastUpdate
        );


    setText(
        "detailConnectionText",
        online
            ? "ONLINE"
            : "OFFLINE"
    );


    const detailDot =
        document.getElementById(
            "detailConnectionDot"
        );


    if (detailDot) {

        detailDot.classList.remove(
            "online",
            "offline"
        );


        detailDot.classList.add(
            online
                ? "online"
                : "offline"
        );
    }


    // =================================================
    // Last Update
    // =================================================

    setText(
        "detailLastUpdate",

        status.lastUpdateText ||
        current.datetime ||
        "--"
    );


    // =================================================
    // Sensor
    // =================================================

    setText(
        "detailSensorStatus",

        status.sensor ||
        "--"
    );


    // =================================================
    // WiFi
    // =================================================

    setText(
        "detailWifiStatus",

        status.wifi ||
        "--"
    );
}


// =====================================================
// Set Text
// =====================================================

function setText(
    elementID,
    value
)
{

    const element =
        document.getElementById(
            elementID
        );


    if (element) {

        element.textContent =
            value;
    }
}


// =====================================================
// Convert Number
// =====================================================

function toNumber(value)
{

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return NaN;
    }


    const number =
        Number(value);


    return Number.isFinite(number)
        ? number
        : NaN;
}


// =====================================================
// Set Status
// =====================================================

function setStatusElement(
    elementID,
    status
)
{

    const element =
        document.getElementById(
            elementID
        );


    if (!element) {

        return;
    }


    element.textContent =
        status.text;


    element.classList.remove(
        "status-good",
        "status-normal",
        "status-bad"
    );


    element.classList.add(
        status.className
    );
}


// =====================================================
// Check Rack Online
// =====================================================

function checkRackOnline(timestamp)
{
    if (
        timestamp === null ||
        timestamp === undefined
    ) {
        return false;
    }


    let value =
        Number(timestamp);


    // =================================================
    // Timestamp เป็น milliseconds
    // =================================================

    if (
        Number.isFinite(value) &&
        value > 100000000000
    ) {
        value =
            value / 1000;
    }


    // =================================================
    // Timestamp เป็น Unix seconds
    // =================================================

    if (
        Number.isFinite(value) &&
        value > 0
    ) {

        const age =
            Date.now() -
            value * 1000;


        // ---------------------------------------------
        // ONLINE <= 30 seconds
        // OFFLINE > 30 seconds
        // ---------------------------------------------

        return (
            age >= 0 &&
            age <= 30000
        );
    }


    // =================================================
    // กรณี timestamp เป็น Date String
    // =================================================

    const date =
        new Date(timestamp);


    if (
        !isNaN(
            date.getTime()
        )
    ) {

        const age =
            Date.now() -
            date.getTime();


        return (
            age >= 0 &&
            age <= 90000
        );
    }


    return false;
}
// =====================================================
// Environment Status
// =====================================================

function getEnvironmentStatus(
    temperature,
    humidity
)
{

    if (
        !Number.isFinite(
            temperature
        ) ||
        !Number.isFinite(
            humidity
        )
    ) {

        return {

            text:
                "Need to Improve Environment",

            className:
                "status-bad",

            level:
                "BAD"
        };
    }


    const temperatureGood =
        temperature >= 15 &&
        temperature <= 30;


    const humidityGood =
        humidity >= 40 &&
        humidity <= 70;


    if (
        temperatureGood &&
        humidityGood
    ) {

        return {

            text:
                "GOOD",

            className:
                "status-good",

            level:
                "GOOD"
        };
    }


    const temperatureNormal =
        temperature >= 5 &&
        temperature <= 40;


    const humidityNormal =
        humidity >= 20 &&
        humidity <= 80;


    if (
        temperatureNormal &&
        humidityNormal
    ) {

        return {

            text:
                "NORMAL",

            className:
                "status-normal",

            level:
                "NORMAL"
        };
    }


    return {

        text:
            "Need to Improve Environment",

        className:
            "status-bad",

        level:
            "BAD"
    };
}


// =====================================================
// Back To Overview
// =====================================================

if (backToOverview) {

    backToOverview.addEventListener(

        "click",

        () => {

            selectedRack =
                null;


            detailPage.style.display =
                "none";


            overviewPage.style.display =
                "block";
        }
    );
}


// =====================================================
// Load Rack History
// =====================================================

function loadRackHistory(
    rackID
)
{

    // =================================================
    // Remove Previous Listener
    // =================================================

    if (historyListener) {

        historyListener();
        historyListener = null;
    }


    const historyRef =
        ref(
            database,
            `racks/${rackID}/history`
        );


    console.log(
        "Reading history:",
        `racks/${rackID}/history`
    );


    historyListener =
        onValue(

            historyRef,

            (snapshot) => {

                const data =
                    snapshot.val();


                console.log(
                    "History:",
                    data
                );


                if (!data) {

                    historyDataForExcel =
                        [];


                    updateTemperatureChart(
                        []
                    );


                    updateHumidityChart(
                        []
                    );


                    updateHistoryTable(
                        []
                    );


                    return;
                }


                const historyArray =
                    Object.entries(data)

                        .map(
                            ([key, value]) => ({

                                id:
                                    key,

                                ...(value || {})
                            })
                        );


                historyDataForExcel =
                    [...historyArray];


                historyArray.sort(
                    (a, b) =>
                        getDateTimeValue(
                            b.datetime
                        ) -
                        getDateTimeValue(
                            a.datetime
                        )
                );


                updateTemperatureChart(
                    historyArray
                );


                updateHumidityChart(
                    historyArray
                );


                updateHistoryTable(
                    historyArray
                );
            },

            (error) => {

                console.error(
                    "History Firebase Error:",
                    error
                );
            }
        );
}


// =====================================================
// Convert DateTime
// =====================================================

function getDateTimeValue(
    datetime
)
{

    if (!datetime) {

        return 0;
    }


    // =================================================
    // Unix timestamp
    // =================================================

    if (
        typeof datetime ===
        "number"
    ) {

        if (
            datetime < 100000000000
        ) {

            return datetime * 1000;
        }

        return datetime;
    }


    // =================================================
    // String
    // =================================================

    const text =
        String(datetime).trim();


    // Format:
    // DD/MM/YYYY HH:mm:ss
    // =================================================

    const match =
        text.match(
            /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/
        );


    if (match) {

        const day =
            Number(match[1]);


        const month =
            Number(match[2]) - 1;


        const year =
            Number(match[3]);


        const hour =
            Number(match[4]);


        const minute =
            Number(match[5]);


        const second =
            Number(match[6]);


        return new Date(
            year,
            month,
            day,
            hour,
            minute,
            second
        ).getTime();
    }


    // =================================================
    // Try normal Date
    // =================================================

    const date =
        new Date(text);


    if (
        !isNaN(
            date.getTime()
        )
    ) {

        return date.getTime();
    }


    return 0;
}


// =====================================================
// Update Temperature Chart
// =====================================================

function updateTemperatureChart(data)
{
    const canvas =
        document.getElementById(
            "temperatureChart"
        );

    if (!canvas) {
        return;
    }


    // เรียงข้อมูลจากเก่า -> ใหม่
    const sorted =
        [...data].sort(
            (a, b) =>
                getDateTimeValue(a.datetime) -
                getDateTimeValue(b.datetime)
        );


    // =================================================
    // X Axis = Time
    // =================================================

    const labels =
        sorted.map(
            item => {

                const time =
                    getTimeOnly(
                        item.datetime
                    );

                return time;
            }
        );


    // =================================================
    // Temperature
    // =================================================

    const values =
        sorted.map(
            item =>
                toNumber(
                    item.temperature
                )
        );


    // =================================================
    // Destroy old chart
    // =================================================

    if (temperatureChart) {

        temperatureChart.destroy();
    }


    // =================================================
    // Create Chart
    // =================================================

    temperatureChart =
        new Chart(

            canvas,

            {

                type: "line",

                data: {

                    labels: labels,

                    datasets: [

                        {

                            label:
                                "Temperature (°C)",

                            data:
                                values,

                            tension:
                                0.3,

                            fill:
                                false,

                            pointRadius:
                                3,

                            pointHoverRadius:
                                5
                        }

                    ]
                },


                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false,


                    // =====================================
                    // Legend - ขวาบน
                    // =====================================

                    plugins: {

                        legend: {

                            display:
                                true,

                            position:
                                "top",

                            align:
                                "end"
                        }

                    },


                    // =====================================
                    // Scales
                    // =====================================

                    scales: {

                        // -------------------------------
                        // X Axis
                        // -------------------------------

                        x: {

                            title: {

                                display:
                                    true,

                                text:
                                    "Time"
                            }

                        },


                        // -------------------------------
                        // Y Axis
                        // -------------------------------

                        y: {

                            title: {

                                display:
                                    true,

                                text:
                                    "Temperature (°C)"
                            },


                            ticks: {

                                stepSize:
                                    0.5,

                                callback:
                                    function(value)
                                    {
                                        return Number(value)
                                            .toFixed(1);
                                    }

                            }

                        }

                    }

                }

            }
        );
}


// =====================================================
// Update Humidity Chart
// =====================================================

function updateHumidityChart(data)
{
    const canvas =
        document.getElementById(
            "humidityChart"
        );

    if (!canvas) {
        return;
    }


    // =================================================
    // เรียงข้อมูลจากเก่า -> ใหม่
    // =================================================

    const sorted =
        [...data].sort(
            (a, b) =>
                getDateTimeValue(a.datetime) -
                getDateTimeValue(b.datetime)
        );


    // =================================================
    // X Axis = Time
    // =================================================

    const labels =
        sorted.map(
            item => {

                return getTimeOnly(
                    item.datetime
                );

            }
        );


    // =================================================
    // Humidity
    // =================================================

    const values =
        sorted.map(
            item =>
                toNumber(
                    item.humidity
                )
        );


    // =================================================
    // Destroy old chart
    // =================================================

    if (humidityChart) {

        humidityChart.destroy();
    }


    // =================================================
    // Create Chart
    // =================================================

    humidityChart =
        new Chart(

            canvas,

            {

                type: "line",

                data: {

                    labels: labels,

                    datasets: [

                        {

                            label:
                                "Humidity (%RH)",

                            data:
                                values,

                            tension:
                                0.3,

                            fill:
                                false,

                            pointRadius:
                                3,

                            pointHoverRadius:
                                5
                        }

                    ]
                },


                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false,


                    // =====================================
                    // Legend - ขวาบน
                    // =====================================

                    plugins: {

                        legend: {

                            display:
                                true,

                            position:
                                "top",

                            align:
                                "end"
                        }

                    },


                    // =====================================
                    // Scales
                    // =====================================

                    scales: {

                        // -------------------------------
                        // X Axis
                        // -------------------------------

                        x: {

                            title: {

                                display:
                                    true,

                                text:
                                    "Time"
                            }

                        },


                        // -------------------------------
                        // Y Axis
                        // -------------------------------

                        y: {

                            title: {

                                display:
                                    true,

                                text:
                                    "Humidity (%RH)"
                            },


                            ticks: {

                                stepSize:
                                    0.5,

                                callback:
                                    function(value)
                                    {
                                        return Number(value)
                                            .toFixed(1);
                                    }

                            }

                        }

                    }

                }

            }
        );
}


// =====================================================
// Get Time Only
// =====================================================

function getTimeOnly(datetime)
{

    if (!datetime) {

        return "--";
    }


    const text =
        String(datetime).trim();


    // =================================================
    // Format:
    // DD/MM/YYYY HH:mm:ss
    // =================================================

    const match =
        text.match(
            /^\d{1,2}\/\d{1,2}\/\d{4}\s+(\d{1,2}):(\d{2}):(\d{2})$/
        );


    if (match) {

        return (
            String(match[1]).padStart(2, "0")
            + ":"
            + match[2]
            + ":"
            + match[3]
        );
    }


    // =================================================
    // Format:
    // YYYY-MM-DD HH:mm:ss
    // =================================================

    const match2 =
        text.match(
            /^\d{4}-\d{1,2}-\d{1,2}\s+(\d{1,2}):(\d{2}):(\d{2})/
        );


    if (match2) {

        return (
            String(match2[1]).padStart(2, "0")
            + ":"
            + match2[2]
            + ":"
            + match2[3]
        );
    }


    // =================================================
    // Try Date
    // =================================================

    const date =
        new Date(text);


    if (
        !isNaN(
            date.getTime()
        )
    ) {

        return date.toLocaleTimeString(
            "en-GB",
            {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }
        );
    }


    return text;
}
// =====================================================
// Update History Table
// =====================================================

function updateHistoryTable(
    data
)
{

    const table =
        document.getElementById(
            "historyTable"
        );


    if (!table) {

        return;
    }


    if (!data || data.length === 0) {

        table.innerHTML = `

            <tr>

                <td colspan="4">
                    Waiting for data...
                </td>

            </tr>

        `;

        return;
    }


    // Show newest 5
    const latest =
        data.slice(0, 5);


    table.innerHTML =
        latest.map(
            item => {

                const datetime =
                    String(
                        item.datetime || ""
                    );


                let date = "--";

                let time = "--";


                if (
                    datetime.includes(" ")
                ) {

                    const parts =
                        datetime.split(" ");

                    date =
                        parts[0] ||
                        "--";

                    time =
                        parts[1] ||
                        "--";

                } else {

                    const d =
                        new Date(
                            getDateTimeValue(
                                datetime
                            )
                        );


                    if (
                        !isNaN(
                            d.getTime()
                        )
                    ) {

                        date =
                            d.toLocaleDateString(
                                "en-GB"
                            );

                        time =
                            d.toLocaleTimeString(
                                "en-GB"
                            );
                    }
                }


                const temperature =
                    toNumber(
                        item.temperature
                    );


                const humidity =
                    toNumber(
                        item.humidity
                    );


                return `

                    <tr>

                        <td>
                            ${date}
                        </td>

                        <td>
                            ${time}
                        </td>

                        <td>
                            ${
                                Number.isFinite(
                                    temperature
                                )
                                    ? temperature.toFixed(1)
                                    : "--"
                            }
                            °C
                        </td>

                        <td>
                            ${
                                Number.isFinite(
                                    humidity
                                )
                                    ? humidity.toFixed(1)
                                    : "--"
                            }
                            %RH
                        </td>

                    </tr>

                `;
            }
        ).join("");
}


// =====================================================
// Download Excel
// =====================================================

function downloadExcel(
    type
)
{

    if (
        !historyDataForExcel ||
        historyDataForExcel.length === 0
    ) {

        alert(
            "ยังไม่มีข้อมูลสำหรับดาวน์โหลด"
        );

        return;
    }


    let data =
        historyDataForExcel.map(
            item => ({

                DateTime:
                    item.datetime || "",

                Temperature:
                    item.temperature ?? "",

                Humidity:
                    item.humidity ?? ""
            })
        );


    if (type === "temperature") {

        data =
            data.map(
                item => ({

                    DateTime:
                        item.DateTime,

                    Temperature:
                        item.Temperature
                })
            );
    }


    if (type === "humidity") {

        data =
            data.map(
                item => ({

                    DateTime:
                        item.DateTime,

                    Humidity:
                        item.Humidity
                })
            );
    }


    const worksheet =
        XLSX.utils.json_to_sheet(
            data
        );


    const workbook =
        XLSX.utils.book_new();


    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Data"
    );


    XLSX.writeFile(
        workbook,
        `${selectedRack || "Rack"}_${type}.xlsx`
    );
}


// =====================================================
// Download Buttons
// =====================================================

const downloadTemperature =
    document.getElementById(
        "downloadTemperature"
    );


const downloadHumidity =
    document.getElementById(
        "downloadHumidity"
    );


const downloadAll =
    document.getElementById(
        "downloadAll"
    );


if (downloadTemperature) {

    downloadTemperature.addEventListener(
        "click",
        () => {

            downloadExcel(
                "temperature"
            );
        }
    );
}


if (downloadHumidity) {

    downloadHumidity.addEventListener(
        "click",
        () => {

            downloadExcel(
                "humidity"
            );
        }
    );
}


if (downloadAll) {

    downloadAll.addEventListener(
        "click",
        () => {

            downloadExcel(
                "all"
            );
        }
    );
}


// =====================================================
// Filter
// =====================================================

function filterRacks(
    mode
)
{

    const cards =
        rackGrid.querySelectorAll(
            ".rack-card"
        );


    cards.forEach(
        card => {

            const statusElement =
                card.querySelector(
                    ".rack-status"
                );


            if (!statusElement) {

                return;
            }


            const status =
                statusElement.textContent
                    .trim()
                    .toUpperCase();


            let show = true;


            if (mode === "online") {

                show =
                    status !==
                    "OFFLINE";
            }


            if (mode === "offline") {

                show =
                    status ===
                    "OFFLINE";
            }


            if (mode === "alert") {

                show =
                    status ===
                    "ALERT" ||
                    status ===
                    "SENSOR ERROR" ||
                    status ===
                    "WIFI ERROR";
            }


            card.style.display =
                show
                    ? ""
                    : "none";
        }
    );
}


const filterAll =
    document.getElementById(
        "filterAll"
    );


const filterOnline =
    document.getElementById(
        "filterOnline"
    );


const filterOffline =
    document.getElementById(
        "filterOffline"
    );


const filterAlert =
    document.getElementById(
        "filterAlert"
    );


const filterButtons =
    [
        filterAll,
        filterOnline,
        filterOffline,
        filterAlert
    ];


// =====================================================
// Set Active Filter Button
// -----------------------------------------------------
// เอา class "active" ออกจากทุกปุ่ม แล้วใส่เฉพาะปุ่มที่กด
// เพื่อให้สีพื้นหลังของปุ่มที่ active เปลี่ยนตามหมวดจริง
// =====================================================

function setActiveFilterButton(
    button
)
{

    filterButtons.forEach(
        (btn) => {

            if (!btn) {

                return;
            }


            btn.classList.remove(
                "active"
            );
        }
    );


    if (button) {

        button.classList.add(
            "active"
        );
    }
}


if (filterAll) {

    filterAll.addEventListener(
        "click",
        () => {

            currentFilterMode =
                "all";

            setActiveFilterButton(
                filterAll
            );

            filterRacks("all");
        }
    );
}


if (filterOnline) {

    filterOnline.addEventListener(
        "click",
        () => {

            currentFilterMode =
                "online";

            setActiveFilterButton(
                filterOnline
            );

            filterRacks("online");
        }
    );
}


if (filterOffline) {

    filterOffline.addEventListener(
        "click",
        () => {

            currentFilterMode =
                "offline";

            setActiveFilterButton(
                filterOffline
            );

            filterRacks("offline");
        }
    );
}


if (filterAlert) {

    filterAlert.addEventListener(
        "click",
        () => {

            currentFilterMode =
                "alert";

            setActiveFilterButton(
                filterAlert
            );

            filterRacks("alert");
        }
    );
}


// =====================================================
// Start
// =====================================================

console.log(
    "Rack Room Monitoring System Started"
);

console.log(
    "Firebase database:",
    firebaseConfig.databaseURL
);