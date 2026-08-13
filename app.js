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
    set
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
const app =
    initializeApp(firebaseConfig);
const database =
    getDatabase(app);
// =====================================================
// Firebase References
// =====================================================
const currentRef =
    ref(database, "current");
const historyRef =
    ref(database, "history");
// =====================================================
// Chart Variables
// =====================================================
let temperatureChart = null;
let humidityChart = null;
// =====================================================
// History Data
// สำหรับ Export Excel
// =====================================================
let historyDataForExcel = [];
// =====================================================
// Connection Status
// =====================================================
const connectionDot =
    document.getElementById(
        "connectionDot"
    );
const connectionText =
    document.getElementById(
        "connectionText"
    );
const lastUpdate =
    document.getElementById(
        "lastUpdate"
    );
// =====================================================
// Current Value
// =====================================================
const temperatureElement =
    document.getElementById(
        "temperature"
    );
const humidityElement =
    document.getElementById(
        "humidity"
    );
const temperatureStatus =
    document.getElementById(
        "temperatureStatus"
    );
const humidityStatus =
    document.getElementById(
        "humidityStatus"
    );
// =====================================================
// Set Online
// =====================================================
function setOnline()
{
    if (connectionDot)
    {
        connectionDot.classList.remove(
            "offline"
        );
        connectionDot.classList.add(
            "online"
        );
    }
    if (connectionText)
    {
        connectionText.textContent =
            "Connected to Firebase";
    }
}
// =====================================================
// Set Offline
// =====================================================
function setOffline()
{
    if (connectionDot)
    {
        connectionDot.classList.remove(
            "online"
        );
        connectionDot.classList.add(
            "offline"
        );
    }
    if (connectionText)
    {
        connectionText.textContent =
            "Disconnected";
    }
}
// =====================================================
// Current Data
// =====================================================
onValue(
    currentRef,
    (snapshot) =>
    {
        const data =
            snapshot.val();
        if (!data)
        {
            console.log(
                "ไม่พบ current data"
            );
            setOffline();
            return;
        }
        console.log(
            "Current:",
            data
        );
        // =============================================
        // อ่าน Temperature
        // =============================================
        let temperature =
            Number(data.temperature);
        // =============================================
        // อ่าน Humidity
        // =============================================
        let humidity =
            Number(data.humidity);
        // =============================================
        // แสดง Temperature
        // =============================================
        if (
            Number.isFinite(
                temperature
            )
        )
        {
            if (temperatureElement)
            {
                temperatureElement.textContent =
                    temperature.toFixed(1);
            }
        }
        // =============================================
        // แสดง Humidity
        // =============================================
        if (
            Number.isFinite(
                humidity
            )
        )
        {
            if (humidityElement)
            {
                humidityElement.textContent =
                    humidity.toFixed(1);
            }
        }
        // =============================================
        // Environment Status
        // =============================================
        const environmentStatus =
            getEnvironmentStatus(
                temperature,
                humidity
            );
        // =============================================
        // แสดงสถานะทั้ง Temperature และ Humidity
        // =============================================
        if (temperatureStatus)
        {
            temperatureStatus.textContent =
                environmentStatus.text;
            temperatureStatus.classList.remove(
                "status-good",
                "status-normal",
                "status-bad"
            );
            temperatureStatus.classList.add(
                environmentStatus.className
            );
        }
        if (humidityStatus)
        {
            humidityStatus.textContent =
                environmentStatus.text;
            humidityStatus.classList.remove(
                "status-good",
                "status-normal",
                "status-bad"
            );
            humidityStatus.classList.add(
                environmentStatus.className
            );
        }
        // =============================================
        // Date / Time
        // =============================================
        if (
            data.datetime &&
            lastUpdate
        )
        {
            lastUpdate.textContent =
                data.datetime;
        }
        // =============================================
        // Firebase Online
        // =============================================
        setOnline();
    },
    (error) =>
    {
        console.error(
            "Firebase error:",
            error
        );
        setOffline();
    }
);
// =====================================================
// Environment Status
//
// GOOD
// Temperature : 15 - 30 °C
// Humidity    : 40 - 70 %RH
//
// NORMAL
// Temperature : 5 - 40 °C
// Humidity    : 20 - 80 %RH
//
// NEED TO IMPROVE นอกเหนือจากช่วงที่กำหนด
// =====================================================
function getEnvironmentStatus(
    temperature,
    humidity
)
{
    // =============================================
    // ตรวจสอบค่าที่อ่านได้
    // =============================================
    if (
        !Number.isFinite(temperature) ||
        !Number.isFinite(humidity)
    )
    {
        return {
            text: "Need to Improve Environment",
            className: "status-bad"
        };
    }
    // =============================================
    // GOOD
    //
    // Temperature 15 - 30 °C
    // Humidity    40 - 70 %RH
    // =============================================
    const temperatureGood =
        temperature >= 15 &&
        temperature <= 30;

    const humidityGood =
        humidity >= 40 &&
        humidity <= 70;
    if (
        temperatureGood &&
        humidityGood
    )
    {
        return {
            text: "GOOD",
            className: "status-good"
        };
    }
    // =============================================
    // NORMAL
    //
    // Temperature 5 - 40 °C
    // Humidity    20 - 80 %RH
    //
    // ไม่จำเป็นต้องอยู่ในช่วงเดียวกัน
    // ขอแค่ทั้ง 2 ค่าไม่เกินขอบเขต
    // =============================================
    const temperatureNormal =
        temperature >= 5 &&
        temperature <= 40;

    const humidityNormal =
        humidity >= 20 &&
        humidity <= 80;
    if (
        temperatureNormal &&
        humidityNormal
    )
    {
        return {
            text: "Normal",
            className: "status-normal"
        };
    }
    // =============================================
    // NEED TO IMPROVE ENVIRONMENT
    //
    // Temperature < 5 หรือ > 40
    // หรือ
    // Humidity < 20 หรือ > 80
    // =============================================
    return {
        text: "Need to Improve Environment",
        className: "status-bad"
    };
}
// =====================================================
// History Data
// =====================================================
onValue(
    historyRef,
    (snapshot) =>
    {
        const data =
            snapshot.val();
        if (!data)
        {
            console.log(
                "ไม่พบ history data"
            );
            historyDataForExcel = [];
            updateTemperatureChart([]);
            updateHumidityChart([]);
            updateHistoryTable([]);
            return;
        }
        console.log(
            "History:",
            data
        );
        // =============================================
        // Firebase Object -> Array
        // =============================================
        const historyArray =
            Object.entries(data)
                .map(
                    ([key, value]) =>
                    ({
                        id: key,
                        ...value
                    })
                );
        // =============================================
        // เก็บข้อมูลทั้งหมดไว้สำหรับ Excel
        // =============================================
        historyDataForExcel =
            [...historyArray];
        // =============================================
        // เรียงข้อมูล
        // ใหม่ -> เก่า
        // =============================================
        historyArray.sort(
            (a, b) =>
                getDateTimeValue(
                    b.datetime
                ) -
                getDateTimeValue(
                    a.datetime
                )
        );
        console.log(
            "Sorted History:",
            historyArray
        );
        // =============================================
        // Update Chart
        // =============================================
        updateTemperatureChart(
            historyArray
        );
        updateHumidityChart(
            historyArray
        );
        // =============================================
        // Update Table
        // =============================================
        updateHistoryTable(
            historyArray
        );
    },
    (error) =>
    {
        console.error(
            "History error:",
            error
        );
    }
);
// =====================================================
// Temperature Chart
//
// แสดง 8 รายการล่าสุด
//
// แกน X:
// เก่า -> ใหม่
//
// ซ้าย -> ขวา
// =====================================================
function updateTemperatureChart(
    data
)
{
    // =============================================
    // เรียงจากเก่า -> ใหม่
    // =============================================
    const sortedData =
        [...data].sort(
            (a, b) =>
                getDateTimeValue(
                    a.datetime
                ) -
                getDateTimeValue(
                    b.datetime
                )
        );
    // =============================================
    // เอา 8 รายการล่าสุด
    // =============================================
    const chartData =
        sortedData.slice(-8);
    // =============================================
    // X Axis = เวลา
    // =============================================
    const labels =
        chartData.map(
            item =>
                getTimeFromDateTime(
                    item.datetime
                )
        );
    // =============================================
    // Temperature
    // =============================================
    const values =
        chartData.map(
            item =>
            {
                const value =
                    Number(
                        item.temperature
                    );
                return Number.isFinite(
                    value
                )
                    ? value
                    : null;
            }
        );
    const canvas =
        document.getElementById(
            "temperatureChart"
        );
    if (!canvas)
    {
        console.warn(
            "ไม่พบ temperatureChart"
        );
        return;
    }
    const ctx =
        canvas.getContext(
            "2d"
        );
    // =============================================
    // ลบกราฟเดิม
    // =============================================
    if (temperatureChart)
    {
        temperatureChart.destroy();
    }
    // =============================================
    // สร้างกราฟ
    // =============================================
    temperatureChart =
        new Chart(
            ctx,
            {
                type: "line",
                data:
                {
                    labels:
                        labels,
                    datasets:
                    [
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
                                4
                        }
                    ]
                },
                options:
                {
                    responsive:
                        true,
                    maintainAspectRatio:
                        false,
                    interaction:
                    {
                        mode:
                            "index",
                        intersect:
                            false
                    },
                    scales:
                    {
                        x:
                        {
                            title:
                            {
                                display:
                                    true,
                                text:
                                    "Time"
                            }
                        },
                        y:
                        {
                            title:
                            {
                                display:
                                    true,
                                text:
                                    "Temperature (°C)"
                            },
                            ticks:
                            {
                                stepSize: 0.5
                            }
                        }
                    }
                }
            }
        );
}
// =====================================================
// Humidity Chart
//
// แสดง 8 รายการล่าสุด
//
// เก่า -> ใหม่
//
// ซ้าย -> ขวา
// =====================================================
function updateHumidityChart(
    data
)
{
    // =============================================
    // เรียงจากเก่า -> ใหม่
    // =============================================
    const sortedData =
        [...data].sort(
            (a, b) =>
                getDateTimeValue(
                    a.datetime
                ) -
                getDateTimeValue(
                    b.datetime
                )
        );
    // =============================================
    // เอา 8 รายการล่าสุด
    // =============================================
    const chartData =
        sortedData.slice(-8);
    // =============================================
    // X Axis = เวลา
    // =============================================
    const labels =
        chartData.map(
            item =>
                getTimeFromDateTime(
                    item.datetime
                )
        );
    // =============================================
    // Humidity
    // =============================================
    const values =
        chartData.map(
            item =>
            {
                const value =
                    Number(
                        item.humidity
                    );
                return Number.isFinite(
                    value
                )
                    ? value
                    : null;
            }
        );
    const canvas =
        document.getElementById(
            "humidityChart"
        );
    if (!canvas)
    {
        console.warn(
            "ไม่พบ humidityChart"
        );
        return;
    }
    const ctx =
        canvas.getContext(
            "2d"
        );
    // =============================================
    // ลบกราฟเดิม
    // =============================================
    if (humidityChart)
    {
        humidityChart.destroy();
    }
    // =============================================
    // สร้างกราฟ
    // =============================================
    humidityChart =
        new Chart(
            ctx,
            {
                type: "line",
                data:
                {
                    labels:
                        labels,
                    datasets:
                    [
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
                                4
                        }
                    ]
                },
                options:
                {
                    responsive:
                        true,

                    maintainAspectRatio:
                        false,

                    interaction:
                    {
                        mode:
                            "index",

                        intersect:
                            false
                    },
                    scales:
                    {
                        x:
                        {
                            title:
                            {
                                display:
                                    true,

                                text:
                                    "Time"
                            }
                        },
                        y:
                        {
                            title:
                            {
                                display:
                                    true,

                                text:
                                    "Humidity (%RH)"
                            }
                        }
                    }
                }
            }
        );
}
// =====================================================
// Measurement History Table
//
// Temperature + Humidity อยู่ตารางเดียว
//
// แสดงสูงสุด 5 รายการ
//
// ใหม่ -> เก่า
// =====================================================
function updateHistoryTable(
    data
)
{
    const table =
        document.getElementById(
            "historyTable"
        );
    if (!table)
    {
        return;
    }
    // =============================================
    // ล้างข้อมูลเดิม
    // =============================================
    table.innerHTML = "";
    // =============================================
    // เรียงใหม่ -> เก่า
    // =============================================
    const sortedData =
        [...data].sort(
            (a, b) =>
                getDateTimeValue(
                    b.datetime
                ) -
                getDateTimeValue(
                    a.datetime
                )
        );
    // =============================================
    // แสดง 5 รายการล่าสุด
    // =============================================
    const latestData =
        sortedData.slice(
            0,
            5
        );
    // =============================================
    // สร้างตาราง
    // =============================================
    latestData.forEach(
        item =>
        {
            const row =
                document.createElement(
                    "tr"
                );
            // =========================================
            // Date
            // =========================================
            let date =
                "--";
            // =========================================
            // Time
            // =========================================
            let time =
                "--";
            if (
                item.datetime
            )
            {
                const parts =
                    item.datetime
                        .trim()
                        .split(" ");
                date =
                    parts[0] ||
                    "--";
                time =
                    parts[1] ||
                    "--";
            }
            // =========================================
            // Temperature
            // =========================================
            const temperatureValue =
                Number(
                    item.temperature
                );
            const temperature =
                Number.isFinite(
                    temperatureValue
                )
                    ? temperatureValue.toFixed(1)
                    : "--";
            // =========================================
            // Humidity
            // =========================================
            const humidityValue =
                Number(
                    item.humidity
                );
            const humidity =
                Number.isFinite(
                    humidityValue
                )
                    ? humidityValue.toFixed(1)
                    : "--";
            // =========================================
            // Row
            // =========================================
            row.innerHTML = `
                <td>${date}</td>
                <td>${time}</td>
                <td>
                    ${temperature} °C
                </td>
                <td>
                    ${humidity} %RH
                </td>
            `;
            table.appendChild(
                row
            );
        }
    );
    // =============================================
    // ไม่มีข้อมูล
    // =============================================
    if (
        latestData.length === 0
    )
    {
        table.innerHTML = `
            <tr>
                <td colspan="4">
                    No data available
                </td>
            </tr>
        `;
    }
}
// =====================================================
// Convert datetime
//
// Input:
// 09/08/2026 14:52:19
//
// Output:
// JavaScript timestamp
// =====================================================
function getDateTimeValue(
    datetime
)
{
    if (!datetime)
    {
        return 0;
    }
    const parts =
        datetime
            .trim()
            .split(" ");
    if (
        parts.length < 2
    )
    {
        return 0;
    }
    const dateParts =
        parts[0]
            .split("/");
    const timeParts =
        parts[1]
            .split(":");
    if (
        dateParts.length !== 3
    )
    {
        return 0;
    }
    const day =
        Number(
            dateParts[0]
        );
    const month =
        Number(
            dateParts[1]
        );
    const year =
        Number(
            dateParts[2]
        );
    const hour =
        Number(
            timeParts[0] || 0
        );
    const minute =
        Number(
            timeParts[1] || 0
        );
    const second =
        Number(
            timeParts[2] || 0
        );
    return new Date(
        year,
        month - 1,
        day,
        hour,
        minute,
        second
    ).getTime();
}
// =====================================================
// Get Time From datetime
//
// Input:
// 09/08/2026 14:52:19
//
// Output:
// 14:52:19
// =====================================================
function getTimeFromDateTime(
    datetime
)
{
    if (!datetime)
    {
        return "--";
    }
    const parts =
        datetime
            .trim()
            .split(" ");
    if (
        parts.length < 2
    )
    {
        return datetime;
    }
    return parts[1];
}
// =====================================================
// Get Date From datetime
//
// Input:
// 09/08/2026 14:52:19
//
// Output:
// 09/08/2026
// =====================================================
function getDateFromDateTime(
    datetime
)
{
    if (!datetime)
    {
        return "--";
    }
    const parts =
        datetime
            .trim()
            .split(" ");
    if (
        parts.length < 2
    )
    {
        return "--";
    }
    return parts[0];
}
// =====================================================
// Export Temperature Excel
// =====================================================
function downloadTemperatureExcel()
{
    if (
        historyDataForExcel.length === 0
    )
    {
        alert(
            "ไม่มีข้อมูล Temperature"
        );
        return;
    }
    // =============================================
    // เรียงเก่า -> ใหม่
    // =============================================
    const sortedData =
        [...historyDataForExcel].sort(
            (a, b) =>
                getDateTimeValue(
                    a.datetime
                ) -
                getDateTimeValue(
                    b.datetime
                )
        );
    // =============================================
    // สร้างข้อมูล Excel
    // =============================================
    const excelData =
        sortedData.map(
            item =>
            ({
                "Date":
                    getDateFromDateTime(
                        item.datetime
                    ),
                "Time":
                    getTimeFromDateTime(
                        item.datetime
                    ),

                "Temperature (°C)":
                    Number.isFinite(
                        Number(
                            item.temperature
                        )
                    )
                        ? Number(
                            item.temperature
                        )
                        : ""
            })
        );
    // =============================================
    // Worksheet
    // =============================================
    const worksheet =
        XLSX.utils.json_to_sheet(
            excelData
        );
    worksheet["!cols"] =
    [
        {
            wch: 15
        },
        {
            wch: 15
        },
        {
            wch: 22
        }
    ];
    // =============================================
    // Workbook
    // =============================================
    const workbook =
        XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Temperature"
    );
    // =============================================
    // Download
    // =============================================
    XLSX.writeFile(
        workbook,
        "Temperature_History.xlsx"
    );
}
// =====================================================
// Export Humidity Excel
// =====================================================
function downloadHumidityExcel()
{
    if (
        historyDataForExcel.length === 0
    )
    {
        alert(
            "ไม่มีข้อมูล Humidity"
        );
        return;
    }
    // =============================================
    // เรียงเก่า -> ใหม่
    // =============================================
    const sortedData =
        [...historyDataForExcel].sort(
            (a, b) =>
                getDateTimeValue(
                    a.datetime
                ) -
                getDateTimeValue(
                    b.datetime
                )
        );
    // =============================================
    // สร้างข้อมูล Excel
    // =============================================
    const excelData =
        sortedData.map(
            item =>
            ({
                "Date":
                    getDateFromDateTime(
                        item.datetime
                    ),
                "Time":
                    getTimeFromDateTime(
                        item.datetime
                    ),
                "Humidity (%RH)":
                    Number.isFinite(
                        Number(
                            item.humidity
                        )
                    )
                        ? Number(
                            item.humidity
                        )
                        : ""
            })
        );
    // =============================================
    // Worksheet
    // =============================================
    const worksheet =
        XLSX.utils.json_to_sheet(
            excelData
        );
    worksheet["!cols"] =
    [
        {
            wch: 15
        },
        {
            wch: 15
        },
        {
            wch: 20
        }
    ];
    // =============================================
    // Workbook
    // =============================================
    const workbook =
        XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Humidity"
    );
    // =============================================
    // Download
    // =============================================
    XLSX.writeFile(
        workbook,
        "Humidity_History.xlsx"
    );
}
// =====================================================
// Export All Data Excel
//
// Temperature + Humidity
// =====================================================
function downloadAllExcel()
{
    if (
        historyDataForExcel.length === 0
    )
    {
        alert(
            "ไม่มีข้อมูลสำหรับดาวน์โหลด"
        );

        return;
    }
    // =============================================
    // เรียงเก่า -> ใหม่
    // =============================================
    const sortedData =
        [...historyDataForExcel].sort(
            (a, b) =>
                getDateTimeValue(
                    a.datetime
                ) -
                getDateTimeValue(
                    b.datetime
                )
        );
    // =============================================
    // สร้างข้อมูล Excel
    // =============================================
    const excelData =
        sortedData.map(
            item =>
            ({
                "Date":
                    getDateFromDateTime(
                        item.datetime
                    ),
                "Time":
                    getTimeFromDateTime(
                        item.datetime
                    ),
                "Temperature (°C)":
                    Number.isFinite(
                        Number(
                            item.temperature
                        )
                    )
                        ? Number(
                            item.temperature
                        )
                        : "",
                "Humidity (%RH)":
                    Number.isFinite(
                        Number(
                            item.humidity
                        )
                    )
                        ? Number(
                            item.humidity
                        )
                        : ""
            })
        );
    // =============================================
    // Worksheet
    // =============================================
    const worksheet =
        XLSX.utils.json_to_sheet(
            excelData
        );
    worksheet["!cols"] =
    [
        {
            wch: 15
        },
        {
            wch: 15
        },
        {
            wch: 22
        },
        {
            wch: 20
        }
    ];
    // =============================================
    // Workbook
    // =============================================
    const workbook =
        XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Sensor History"
    );
    // =============================================
    // Download
    // =============================================
    XLSX.writeFile(
        workbook,
        "RackRoom_Sensor_History.xlsx"
    );
}
// =====================================================
// Download Button Events
// =====================================================
const downloadTemperatureButton =
    document.getElementById(
        "downloadTemperature"
    );
const downloadHumidityButton =
    document.getElementById(
        "downloadHumidity"
    );
const downloadAllButton =
    document.getElementById(
        "downloadAll"
    );
// =====================================================
// Temperature Button
// =====================================================
if (
    downloadTemperatureButton
)
{
    downloadTemperatureButton.addEventListener(
        "click",
        downloadTemperatureExcel
    );
}
// =====================================================
// Humidity Button
// =====================================================
if (
    downloadHumidityButton
)
{
    downloadHumidityButton.addEventListener(
        "click",
        downloadHumidityExcel
    );
}
// =====================================================
// All Data Button
// =====================================================
if (
    downloadAllButton
)
{
    downloadAllButton.addEventListener(
        "click",
        downloadAllExcel
    );
}