// =====================================================
// Firebase
// =====================================================

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";

import {
    getDatabase,
    ref,
    onValue,
    update
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
// Server Icon
// =====================================================

const SERVER_ICON_SVG = `
<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">

    <rect
        x="8"
        y="4"
        width="32"
        height="12"
        rx="2"
        fill="#3b4a63"
    />

    <rect
        x="8"
        y="18"
        width="32"
        height="12"
        rx="2"
        fill="#2c3a52"
    />

    <rect
        x="8"
        y="32"
        width="32"
        height="12"
        rx="2"
        fill="#3b4a63"
    />

    <circle
        cx="14"
        cy="10"
        r="1.6"
        fill="#22c55e"
    />

    <circle
        cx="14"
        cy="24"
        r="1.6"
        fill="#22c55e"
    />

    <circle
        cx="14"
        cy="38"
        r="1.6"
        fill="#22c55e"
    />

    <rect
        x="20"
        y="8.5"
        width="12"
        height="3"
        rx="1"
        fill="#8fa2c2"
    />

    <rect
        x="20"
        y="22.5"
        width="12"
        height="3"
        rx="1"
        fill="#8fa2c2"
    />

    <rect
        x="20"
        y="36.5"
        width="12"
        height="3"
        rx="1"
        fill="#8fa2c2"
    />

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

const connectionDot =
    document.getElementById("connectionDot");

const connectionText =
    document.getElementById("connectionText");


// =====================================================
// Firebase Connection
// =====================================================

const connectedRef =
    ref(
        database,
        ".info/connected"
    );

onValue(
    connectedRef,

    (snapshot) => {

        const connected =
            snapshot.val() === true;

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
// Read All Racks
// =====================================================

onValue(

    racksRef,

    (snapshot) => {

        const data =
            snapshot.val();

        if (!data) {

            allRackData = {};

            updateSummary({});

            if (rackGrid) {

                rackGrid.innerHTML = `
                    <div class="empty-state">
                        ไม่พบข้อมูล Rack ใน Firebase
                        <br><br>
                        <small>
                            กรุณาตรวจสอบ Firebase path /racks
                        </small>
                    </div>
                `;
            }

            return;
        }

        allRackData =
            data;

        updateSummary(
            data
        );

        renderRackOverview(
            data
        );

        if (
            selectedRack &&
            data[selectedRack]
        ) {

            updateDetailData(
                selectedRack,
                data[selectedRack]
            );
        }

        startLiveStatusInterval();
    },

    (error) => {

        console.error(
            "Rack Firebase Error:",
            error
        );

        if (rackGrid) {

            rackGrid.innerHTML = `
                <div class="empty-state">
                    <strong>Firebase Error</strong>
                    <br><br>
                    ${error.message}
                </div>
            `;
        }
    }
);


// =====================================================
// Update Summary
// =====================================================

function updateSummary(racks) {

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

                if (
                    environment.level === "BAD" ||
                    status.sensor !== "OK" ||
                    status.wifi !== "OK"
                ) {

                    alert++;
                }

            } else {

                offline++;
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
}


// =====================================================
// Live Status
// =====================================================

function startLiveStatusInterval() {

    if (liveStatusInterval) {

        return;
    }

    liveStatusInterval =
        setInterval(
            () => {

                if (
                    !allRackData ||
                    Object.keys(
                        allRackData
                    ).length === 0
                ) {

                    return;
                }

                updateSummary(
                    allRackData
                );

                renderRackOverview(
                    allRackData
                );

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

function renderRackOverview(racks) {

    if (!rackGrid) {

        return;
    }

    rackGrid.innerHTML = "";

    Object.entries(
        racks
    ).forEach(
        ([rackID, rackData]) => {

            const card =
                createRackCard(
                    rackID,
                    rackData
                );

            rackGrid.appendChild(
                card
            );
        }
    );

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
) {

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

    const displayName =
        rackData?.name ||
        rackID;

    let overallStatus =
        "GOOD";

    let overallClass =
        "online-good";

    let displayTemp =
        Number.isFinite(
            temperature
        )
            ? temperature.toFixed(1)
            : "--";

    let displayHum =
        Number.isFinite(
            humidity
        )
            ? humidity.toFixed(1)
            : "--";

    let envLabel =
        environment.text;

    let miniCardClass =
        environment.className;

    if (!online) {

        overallStatus =
            "OFFLINE";

        overallClass =
            "offline";

        envLabel =
            "OFFLINE";

        displayTemp =
            "--";

        displayHum =
            "--";

        miniCardClass =
            "status-offline";

    } else if (!sensorOK) {

        overallStatus =
            "SENSOR ERROR";

        overallClass =
            "alarm";

    } else if (!wifiOK) {

        overallStatus =
            "WIFI ERROR";

        overallClass =
            "alarm";

    } else if (
        environment.level === "BAD"
    ) {

        overallStatus =
            "ALERT";

        overallClass =
            "alarm";

    } else {

        overallStatus =
            environment.level;

        overallClass =
            "warning";
    }

    const card =
        document.createElement(
            "div"
        );

    card.className =
        `rack-card ${overallClass}`;

    card.innerHTML = `

        <div class="rack-card-top">

            <div class="rack-icon">
                ${SERVER_ICON_SVG}
            </div>

            <div class="rack-card-title">

                <h3>
                    ${displayName}
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

            <div
                class="card card-mini ${miniCardClass}"
            >

                <div class="card-header">

                    <span class="card-title">
                        Temp
                    </span>

                </div>

                <div class="card-body">

                    <div class="status-box">

                        <span class="status-label">
                            status:
                        </span>

                        <span class="status-value">
                            ${envLabel}
                        </span>

                    </div>

                    <div class="value-box">

                        <span class="number">
                            ${displayTemp}
                        </span>

                        <span class="unit">
                            °c
                        </span>

                    </div>

                </div>

            </div>


            <div
                class="card card-mini ${miniCardClass}"
            >

                <div class="card-header">

                    <span class="card-title">
                        Humidity
                    </span>

                </div>

                <div class="card-body">

                    <div class="status-box">

                        <span class="status-label">
                            status:
                        </span>

                        <span class="status-value">
                            ${envLabel}
                        </span>

                    </div>

                    <div class="value-box">

                        <span class="number">
                            ${displayHum}
                        </span>

                        <span class="unit">
                            %
                        </span>

                    </div>

                </div>

            </div>

        </div>


        <span
            class="rack-status"
            style="display:none;"
        >
            ${overallStatus}
        </span>


        <button class="view-rack">
            View Details →
        </button>

    `;

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

    if (button) {

        button.addEventListener(
            "click",
            (event) => {

                event.stopPropagation();

                openRackDetail(
                    rackID
                );
            }
        );
    }

    return card;
}


// =====================================================
// Open Rack Detail
// =====================================================

function openRackDetail(
    rackID
) {

    selectedRack =
        rackID;

    if (overviewPage) {

        overviewPage.style.display =
            "none";
    }

    if (detailPage) {

        detailPage.style.display =
            "block";
    }

    const rackData =
        allRackData[rackID];

    if (!rackData) {

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
) {

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

    const online =
        checkRackOnline(
            status.lastUpdate
        );

    const displayName =
        rackData?.name ||
        rackID;

    setText(
        "detailRackTitle",
        displayName
    );

    let displayTemp =
        "--";

    let displayHum =
        "--";

    let environment = {};

    if (online) {

        displayTemp =
            Number.isFinite(
                temperature
            )
                ? temperature.toFixed(1)
                : "--";

        displayHum =
            Number.isFinite(
                humidity
            )
                ? humidity.toFixed(1)
                : "--";

        environment =
            getEnvironmentStatus(
                temperature,
                humidity
            );

    } else {

        environment = {

            text:
                "OFFLINE",

            className:
                "status-offline",

            level:
                "OFFLINE"
        };
    }

    setText(
        "temperature",
        displayTemp
    );

    setText(
        "humidity",
        displayHum
    );

    setStatusElement(
        "temperatureStatus",
        environment
    );

    setStatusElement(
        "humidityStatus",
        environment
    );

    const tempCard =
        document.getElementById(
            "temperatureCard"
        );

    if (tempCard) {

        tempCard.className =
            `card ${environment.className}`;
    }

    const humCard =
        document.getElementById(
            "humidityCard"
        );

    if (humCard) {

        humCard.className =
            `card ${environment.className}`;
    }

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

    setText(
        "detailLastUpdate",
        status.lastUpdateText ||
        current.datetime ||
        "--"
    );

    setText(
        "detailSensorStatus",
        status.sensor ||
        "--"
    );

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
) {

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

function toNumber(
    value
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return NaN;
    }

    const number =
        Number(value);

    return Number.isFinite(
        number
    )
        ? number
        : NaN;
}


// =====================================================
// Set Status
// =====================================================

function setStatusElement(
    elementID,
    status
) {

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
        "status-class-a",
        "status-class-b",
        "status-class-s1",
        "status-class-s2",
        "status-class-s3",
        "status-bad",
        "status-offline"
    );

    element.classList.add(
        status.className
    );
}


// =====================================================
// Check Rack Online
// =====================================================

function checkRackOnline(
    timestamp
) {

    if (
        timestamp === null ||
        timestamp === undefined
    ) {

        return false;
    }

    let value =
        Number(timestamp);

    if (
        Number.isFinite(value) &&
        value > 100000000000
    ) {

        value =
            value / 1000;
    }

    if (
        Number.isFinite(value) &&
        value > 0
    ) {

        const age =
            Date.now() -
            value * 1000;

        return (
            age >= 0 &&
            age <= 90000
        );
    }

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
) {

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
                "BAD",

            className:
                "status-bad",

            level:
                "BAD"
        };
    }


    // Class A
    // Temperature: 15~30°C
    // Humidity: 40~70%RH

    if (
        temperature >= 15 &&
        temperature <= 30 &&
        humidity >= 40 &&
        humidity <= 70
    ) {

        return {

            text:
                "GOOD",

            className:
                "status-class-a",

            level:
                "GOOD"
        };
    }


    // Class B
    // Temperature: 5~40°C
    // Humidity: 20~80%RH

    if (
        temperature >= 5 &&
        temperature <= 40 &&
        humidity >= 20 &&
        humidity <= 80
    ) {

        return {

            text:
                "NORMAL",

            className:
                "status-class-b",

            level:
                "NORMAL"
        };
    }


    // Class S1

    if (
        temperature >= 0 &&
        temperature <= 50 &&
        humidity >= 10 &&
        humidity <= 90
    ) {

        return {

            text:
                "BAD",

            className:
                "status-class-s1",

            level:
                "BAD"
        };
    }


    // Class S2

    if (
        temperature >= -10 &&
        temperature <= 60 &&
        humidity >= 5 &&
        humidity <= 95
    ) {

        return {

            text:
                "BAD",

            className:
                "status-class-s2",

            level:
                "BAD"
        };
    }


    // Class S3

    if (
        temperature >= -25 &&
        temperature <= 70 &&
        humidity >= 5 &&
        humidity <= 100
    ) {

        return {

            text:
                "BAD",

            className:
                "status-class-s3",

            level:
                "BAD"
        };
    }


    return {

        text:
            "BAD",

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

            if (detailPage) {

                detailPage.style.display =
                    "none";
            }

            if (overviewPage) {

                overviewPage.style.display =
                    "block";
            }
        }
    );
}


// =====================================================
// Load Rack History
// =====================================================

function loadRackHistory(
    rackID
) {

    if (historyListener) {

        historyListener();

        historyListener =
            null;
    }

    const historyRef =
        ref(
            database,
            `racks/${rackID}/history`
        );

    historyListener =
        onValue(

            historyRef,

            (snapshot) => {

                const data =
                    snapshot.val();

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
                    Object.entries(
                        data
                    ).map(
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
) {

    if (!datetime) {

        return 0;
    }

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

    const text =
        String(
            datetime
        ).trim();

    const match =
        text.match(
            /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/
        );

    if (match) {

        const day =
            Number(
                match[1]
            );

        const month =
            Number(
                match[2]
            ) - 1;

        const year =
            Number(
                match[3]
            );

        const hour =
            Number(
                match[4]
            );

        const minute =
            Number(
                match[5]
            );

        const second =
            Number(
                match[6]
            );

        return new Date(
            year,
            month,
            day,
            hour,
            minute,
            second
        ).getTime();
    }

    const date =
        new Date(
            text
        );

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
// Get Time Only
// =====================================================

function getTimeOnly(
    datetime
) {

    if (!datetime) {

        return "--";
    }

    const text =
        String(
            datetime
        ).trim();

    const match =
        text.match(
            /^\d{1,2}\/\d{1,2}\/\d{4}\s+(\d{1,2}):(\d{2}):(\d{2})$/
        );

    if (match) {

        return (
            String(
                match[1]
            ).padStart(
                2,
                "0"
            )
            + ":"
            + match[2]
            + ":"
            + match[3]
        );
    }

    const match2 =
        text.match(
            /^\d{4}-\d{1,2}-\d{1,2}\s+(\d{1,2}):(\d{2}):(\d{2})/
        );

    if (match2) {

        return (
            String(
                match2[1]
            ).padStart(
                2,
                "0"
            )
            + ":"
            + match2[2]
            + ":"
            + match2[3]
        );
    }

    const date =
        new Date(
            text
        );

    if (
        !isNaN(
            date.getTime()
        )
    ) {

        return date.toLocaleTimeString(
            "en-GB",
            {
                hour:
                    "2-digit",

                minute:
                    "2-digit",

                second:
                    "2-digit"
            }
        );
    }

    return text;
}


// =====================================================
// Chart Layout
// =====================================================
//
// กราฟจะมีโครงสร้าง:
//
// chart-container
//
//    fixed-y-axis-title
//          |
//    chart-scroll-wrapper
//          |
//    chart-scroll-inner
//          |
//        canvas
//
//    fixed-x-axis-title
//
// ดังนั้น:
// - Y Axis Title ไม่เลื่อน
// - Time ไม่เลื่อน
// - กราฟเลื่อน
// - เวลาในแกน X เลื่อน
// - มี Scrollbar เพียงอันเดียว
//
// =====================================================

function prepareChartScroll(
    canvas,
    dataCount,
    yAxisTitle,
    xAxisTitle
) {

    if (!canvas) {

        return null;
    }

    const originalParent =
        canvas.parentElement;

    if (!originalParent) {

        return null;
    }

    let shell =
        canvas.closest(
            ".chart-scroll-shell"
        );

    let scrollWrapper;

    let chartInner;


    // =================================================
    // สร้าง Layout ครั้งแรก
    // =================================================

    if (!shell) {

        shell =
            document.createElement(
                "div"
            );

        shell.className =
            "chart-scroll-shell";


        // Y Axis Title

        const fixedYAxisTitle =
            document.createElement(
                "div"
            );

        fixedYAxisTitle.className =
            "fixed-y-axis-title";

        fixedYAxisTitle.textContent =
            yAxisTitle;


        // Scroll Wrapper

        scrollWrapper =
            document.createElement(
                "div"
            );

        scrollWrapper.className =
            "chart-scroll-wrapper";


        // Chart Inner

        chartInner =
            document.createElement(
                "div"
            );

        chartInner.className =
            "chart-scroll-inner";


        // X Axis Title

        const fixedXAxisTitle =
            document.createElement(
                "div"
            );

        fixedXAxisTitle.className =
            "fixed-x-axis-title";

        fixedXAxisTitle.textContent =
            xAxisTitle;


        // ใส่ Canvas เข้า Inner

        canvas.remove();

        chartInner.appendChild(
            canvas
        );


        scrollWrapper.appendChild(
            chartInner
        );


        shell.appendChild(
            fixedYAxisTitle
        );

        shell.appendChild(
            scrollWrapper
        );

        shell.appendChild(
            fixedXAxisTitle
        );


        // ล้าง Wrapper เดิม

        originalParent.innerHTML =
            "";

        originalParent.appendChild(
            shell
        );

    } else {

        scrollWrapper =
            shell.querySelector(
                ".chart-scroll-wrapper"
            );

        chartInner =
            shell.querySelector(
                ".chart-scroll-inner"
            );

        const yTitle =
            shell.querySelector(
                ".fixed-y-axis-title"
            );

        const xTitle =
            shell.querySelector(
                ".fixed-x-axis-title"
            );

        if (yTitle) {

            yTitle.textContent =
                yAxisTitle;
        }

        if (xTitle) {

            xTitle.textContent =
                xAxisTitle;
        }
    }


    if (
        !scrollWrapper ||
        !chartInner
    ) {

        return null;
    }


    // =================================================
    // ความกว้างกราฟ
    // =================================================

    const pointWidth =
        80;

    const minimumWidth =
        1000;

    const parentWidth =
        scrollWrapper.clientWidth ||
        1000;

    const calculatedWidth =
        Math.max(
            minimumWidth,
            dataCount * pointWidth,
            parentWidth
        );


    chartInner.style.width =
        `${calculatedWidth}px`;

    chartInner.style.minWidth =
        `${calculatedWidth}px`;

    chartInner.style.height =
        "300px";

    chartInner.style.position =
        "relative";


    canvas.style.width =
        "100%";

    canvas.style.height =
        "100%";

    canvas.style.display =
        "block";


    return {

        shell:
            shell,

        scroll:
            scrollWrapper,

        inner:
            chartInner,

        canvas:
            canvas
    };
}


// =====================================================
// Chart CSS
// =====================================================

function addChartScrollStyle() {

    if (
        document.getElementById(
            "chart-scroll-style"
        )
    ) {

        return;
    }

    const style =
        document.createElement(
            "style"
        );

    style.id =
        "chart-scroll-style";

    style.textContent = `

        /* =============================================
           Container
        ============================================= */

        .chart-container {

            position: relative;

            width: 100%;

            height: 350px;

            overflow: hidden !important;
        }


        /* =============================================
           Main Shell
        ============================================= */

        .chart-scroll-shell {

            position: relative;

            width: 100%;

            height: 350px;

            overflow: hidden;

            padding: 0;
        }


        /* =============================================
           Scrollbar อยู่ตรงนี้เพียงจุดเดียว
        ============================================= */

        .chart-scroll-wrapper {

            position: absolute;

            top: 0;

            left: 0;

            right: 0;

            height: 315px;

            width: 100%;

            max-width: 100%;

            overflow-x: auto;

            overflow-y: hidden;

            box-sizing: border-box;

            padding-left: 45px;
        }


        /* =============================================
           Chart Inner
        ============================================= */

        .chart-scroll-inner {

            position: relative;

            height: 300px;
        }


        /* =============================================
           Scrollbar
        ============================================= */

        .chart-scroll-wrapper::-webkit-scrollbar {

            height: 10px;
        }


        .chart-scroll-wrapper::-webkit-scrollbar-track {

            background: #e5e7eb;

            border-radius: 10px;
        }


        .chart-scroll-wrapper::-webkit-scrollbar-thumb {

            background: #9ca3af;

            border-radius: 10px;
        }


        .chart-scroll-wrapper::-webkit-scrollbar-thumb:hover {

            background: #6b7280;
        }


        /* =============================================
           Y Axis Title
           ล็อกอยู่กับที่
        ============================================= */

        .fixed-y-axis-title {

            position: absolute;

            left: 0;

            top: 0;

            width: 45px;

            height: 300px;

            display: flex;

            align-items: center;

            justify-content: center;

            writing-mode: vertical-rl;

            transform: rotate(180deg);

            font-size: 12px;

            color: #555;

            z-index: 20;

            pointer-events: none;

            background: #fff;
        }


        /* =============================================
           X Axis Title
           Time ล็อกอยู่กับที่
        ============================================= */

        .fixed-x-axis-title {

            position: absolute;

            left: 45px;

            right: 0;

            bottom: 0;

            height: 28px;

            display: flex;

            align-items: center;

            justify-content: center;

            font-size: 12px;

            color: #555;

            z-index: 20;

            pointer-events: none;

            background: #fff;
        }

    `;

    document.head.appendChild(
        style
    );
}

addChartScrollStyle();


// =====================================================
// Update Temperature Chart
// =====================================================

function updateTemperatureChart(
    data
) {

    const canvas =
        document.getElementById(
            "temperatureChart"
        );

    if (!canvas) {

        return;
    }


    const sorted =
        [...data].sort(
            (a, b) =>
                getDateTimeValue(
                    a.datetime
                ) -
                getDateTimeValue(
                    b.datetime
                )
        );


    const labels =
        sorted.map(
            item =>
                getTimeOnly(
                    item.datetime
                )
        );


    const values =
        sorted.map(
            item =>
                toNumber(
                    item.temperature
                )
        );


    prepareChartScroll(
        canvas,
        labels.length,
        "Temperature (°C)",
        "Time"
    );


    if (temperatureChart) {

        temperatureChart.destroy();

        temperatureChart =
            null;
    }


    temperatureChart =
        new Chart(
            canvas,
            {

                type:
                    "line",

                data: {

                    labels:
                        labels,

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


                    scales: {

                        x: {

                            title: {

                                display:
                                    false
                            },

                            ticks: {

                                autoSkip:
                                    false,

                                maxRotation:
                                    35,

                                minRotation:
                                    35
                            }
                        },


                        y: {

                            title: {

                                display:
                                    false
                            },

                            ticks: {

                                stepSize:
                                    0.5,

                                callback:
                                    function (
                                        value
                                    ) {

                                        return Number(
                                            value
                                        ).toFixed(1);
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

function updateHumidityChart(
    data
) {

    const canvas =
        document.getElementById(
            "humidityChart"
        );

    if (!canvas) {

        return;
    }


    const sorted =
        [...data].sort(
            (a, b) =>
                getDateTimeValue(
                    a.datetime
                ) -
                getDateTimeValue(
                    b.datetime
                )
        );


    const labels =
        sorted.map(
            item =>
                getTimeOnly(
                    item.datetime
                )
        );


    const values =
        sorted.map(
            item =>
                toNumber(
                    item.humidity
                )
        );


    prepareChartScroll(
        canvas,
        labels.length,
        "Humidity (%RH)",
        "Time"
    );


    if (humidityChart) {

        humidityChart.destroy();

        humidityChart =
            null;
    }


    humidityChart =
        new Chart(
            canvas,
            {

                type:
                    "line",

                data: {

                    labels:
                        labels,

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


                    scales: {

                        x: {

                            title: {

                                display:
                                    false
                            },

                            ticks: {

                                autoSkip:
                                    false,

                                maxRotation:
                                    35,

                                minRotation:
                                    35
                            }
                        },


                        y: {

                            title: {

                                display:
                                    false
                            },

                            ticks: {

                                stepSize:
                                    0.5,

                                callback:
                                    function (
                                        value
                                    ) {

                                        return Number(
                                            value
                                        ).toFixed(1);
                                    }
                            }
                        }
                    }
                }
            }
        );
}


// =====================================================
// Update History Table
// =====================================================

function updateHistoryTable(
    data
) {

    const table =
        document.getElementById(
            "historyTable"
        );

    if (!table) {

        return;
    }


    if (
        !data ||
        data.length === 0
    ) {

        table.innerHTML = `

            <tr>

                <td colspan="4">
                    Waiting for data...
                </td>

            </tr>

        `;

        return;
    }


    const latest =
        data.slice(
            0,
            5
        );


    table.innerHTML =
        latest.map(
            item => {

                const datetime =
                    String(
                        item.datetime ||
                        ""
                    );


                let date =
                    "--";

                let time =
                    "--";


                if (
                    datetime.includes(
                        " "
                    )
                ) {

                    const parts =
                        datetime.split(
                            " "
                        );

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
) {

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
                    item.datetime ||
                    "",

                Temperature:
                    item.temperature ??
                    "",

                Humidity:
                    item.humidity ??
                    ""
            })
        );


    if (
        type ===
        "temperature"
    ) {

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


    if (
        type ===
        "humidity"
    ) {

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
) {

    if (!rackGrid) {

        return;
    }


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


            let show =
                true;


            if (
                mode ===
                "online"
            ) {

                show =
                    status !==
                    "OFFLINE";
            }


            if (
                mode ===
                "offline"
            ) {

                show =
                    status ===
                    "OFFLINE";
            }


            if (
                mode ===
                "alert"
            ) {

                show =
                    status ===
                        "BAD" ||

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


// =====================================================
// Filter Buttons
// =====================================================

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


const filterButtons = [

    filterAll,

    filterOnline,

    filterOffline,

    filterAlert

];


// =====================================================
// Set Active Filter
// =====================================================

function setActiveFilterButton(
    button
) {

    filterButtons.forEach(
        btn => {

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


// =====================================================
// Filter All
// =====================================================

if (filterAll) {

    filterAll.addEventListener(
        "click",
        () => {

            currentFilterMode =
                "all";

            setActiveFilterButton(
                filterAll
            );

            filterRacks(
                "all"
            );
        }
    );
}


// =====================================================
// Filter Online
// =====================================================

if (filterOnline) {

    filterOnline.addEventListener(
        "click",
        () => {

            currentFilterMode =
                "online";

            setActiveFilterButton(
                filterOnline
            );

            filterRacks(
                "online"
            );
        }
    );
}


// =====================================================
// Filter Offline
// =====================================================

if (filterOffline) {

    filterOffline.addEventListener(
        "click",
        () => {

            currentFilterMode =
                "offline";

            setActiveFilterButton(
                filterOffline
            );

            filterRacks(
                "offline"
            );
        }
    );
}


// =====================================================
// Filter Alert
// =====================================================

if (filterAlert) {

    filterAlert.addEventListener(
        "click",
        () => {

            currentFilterMode =
                "alert";

            setActiveFilterButton(
                filterAlert
            );

            filterRacks(
                "alert"
            );
        }
    );
}


// =====================================================
// Edit Rack Name
// =====================================================

const editRackNameBtn =
    document.getElementById(
        "editRackNameBtn"
    );

const editNameModal =
    document.getElementById(
        "editNameModal"
    );

const editNameInput =
    document.getElementById(
        "editNameInput"
    );

const saveEditBtn =
    document.getElementById(
        "saveEditBtn"
    );

const cancelEditBtn =
    document.getElementById(
        "cancelEditBtn"
    );


// =====================================================
// Open Edit Modal
// =====================================================

if (
    editRackNameBtn &&
    editNameModal
) {

    editRackNameBtn.addEventListener(
        "click",
        () => {

            if (!selectedRack) {

                return;
            }


            const rackData =
                allRackData[
                    selectedRack
                ];


            const currentName =
                rackData?.name ||
                selectedRack;


            if (editNameInput) {

                editNameInput.value =
                    currentName;
            }


            editNameModal.style.display =
                "flex";


            if (editNameInput) {

                editNameInput.focus();
            }
        }
    );
}


// =====================================================
// Cancel Edit
// =====================================================

if (
    cancelEditBtn &&
    editNameModal
) {

    cancelEditBtn.addEventListener(
        "click",
        () => {

            editNameModal.style.display =
                "none";
        }
    );
}


// =====================================================
// Save Rack Name
// =====================================================

if (saveEditBtn) {

    saveEditBtn.addEventListener(
        "click",
        () => {

            if (!selectedRack) {

                return;
            }


            if (!editNameInput) {

                return;
            }


            const newName =
                editNameInput.value.trim();


            if (
                newName !== ""
            ) {

                const rackRef =
                    ref(
                        database,
                        `racks/${selectedRack}`
                    );


                update(
                    rackRef,
                    {
                        name:
                            newName
                    }
                )

                    .then(
                        () => {

                            console.log(
                                "เปลี่ยนชื่อสำเร็จ"
                            );

                            if (
                                editNameModal
                            ) {

                                editNameModal.style.display =
                                    "none";
                            }
                        }
                    )

                    .catch(
                        error => {

                            alert(
                                "เกิดข้อผิดพลาดในการเปลี่ยนชื่อ: " +
                                error.message
                            );
                        }
                    );

            } else {

                alert(
                    "กรุณากรอกชื่อ Rack ครับ"
                );

                editNameInput.focus();
            }
        }
    );
}