const express = require("express");
const { initializeApp, cert } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");
require("dotenv").config();

const app = express();

app.use(express.json());

// ===============================
// Firebase Admin
// ===============================

const serviceAccount = require("./serviceAccountKey.json");

initializeApp({
    credential: cert(serviceAccount),
    databaseURL:
        "https://rackroom-6e221-default-rtdb.asia-southeast1.firebasedatabase.app"
});

const db = getDatabase();

// ===============================
// LINE Messaging API
// ===============================

async function sendLineMessage(text) {
    const response = await fetch(
        "https://api.line.me/v2/bot/message/push",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
            },
            body: JSON.stringify({
                to: process.env.LINE_USER_ID,
                messages: [
                    {
                        type: "text",
                        text: text
                    }
                ]
            })
        }
    );

    if (!response.ok) {
        const errorText = await response.text();

        throw new Error(
            `LINE API Error ${response.status}: ${errorText}`
        );
    }

    console.log("LINE message sent!");
}

console.log("Firebase Admin connected!");

// ===============================
// Test Backend
// ===============================

app.get("/", (req, res) => {
    res.send("Rack Room Backend is running!");
});

// ===============================
// Test Firebase
// ===============================

app.get("/test-firebase", async (req, res) => {
    try {
        const snapshot = await db.ref("racks").once("value");
        const data = snapshot.val();

        console.log("Firebase data:");
        console.log(data);

        res.json({
            success: true,
            data: data
        });

    } catch (error) {

        console.error("Firebase error:", error);

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===============================
// Test LINE
// ===============================

// ===============================
// Test LINE with Temperature & Humidity
// ===============================

app.get("/test-line", async (req, res) => {
    try {
        // อ่านข้อมูลจาก Firebase
        const snapshot = await db.ref("racks").once("value");
        const racks = snapshot.val();

        // เลือก RACK-01
        const rack = racks["RACK-01"];

        if (!rack || !rack.current) {
            throw new Error("ไม่พบข้อมูล current ของ RACK-01");
        }

        const temperature = rack.current.temperature;
        const humidity = rack.current.humidity;

        // ข้อความที่จะส่งเข้า LINE
        const message =
            "🌡️ Rack Room Monitoring\n\n" +
            "📍 RACK-01\n" +
            "━━━━━━━━━━━━━━\n" +
            `🌡️ Temperature : ${temperature} °C\n` +
            `💧 Humidity : ${humidity} %RH\n` +
            "━━━━━━━━━━━━━━";

        // ส่ง LINE
        await sendLineMessage(message);

        res.json({
            success: true,
            temperature: temperature,
            humidity: humidity,
            message: "LINE message sent successfully"
        });

    } catch (error) {

        console.error("LINE error:", error);

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===============================
// Start Server
// ===============================

const PORT = 3000;

app.listen(PORT, () => {
    console.log(
        `Backend running at http://localhost:${PORT}`
    );
});