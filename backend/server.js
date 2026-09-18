const express = require("express");
const { initializeApp, cert } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");
const cron = require("node-cron");
require("dotenv").config();

const app = express();
app.use(express.json());

// ===============================
// Firebase Admin
// ===============================
const serviceAccount = require("./serviceAccountKey.json");

initializeApp({
    credential: cert(serviceAccount),
    databaseURL: "https://rackroom-6e221-default-rtdb.asia-southeast1.firebasedatabase.app"
});

const db = getDatabase();
console.log("Firebase Admin connected!");

// ===============================
// LINE Messaging API (รองรับ Flex Message)
// ===============================
async function sendLineFlexMessage(altText, flexContents) {
    try {
        const response = await fetch("https://api.line.me/v2/bot/message/push", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
            },
            body: JSON.stringify({
                to: process.env.LINE_USER_ID,
                messages: [
                    {
                        type: "flex",
                        altText: altText,
                        contents: flexContents
                    }
                ]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`LINE API Error ${response.status}: ${errorText}`);
        }
        console.log("LINE Flex Message sent!");
    } catch (error) {
        console.error("Error sending LINE message:", error.message);
    }
}

// ===============================
// ฟังก์ชันตรวจสอบสถานะ 3 ระดับ (GOOD, WARNING, ALERT)
// ===============================
function getRackStatusLevel(rackData) {
    if (!rackData || !rackData.current) return "ALERT";

    const temp = Number(rackData.current.temperature);
    const hum = Number(rackData.current.humidity);

    // 1. เช็กข้อมูลผิดปกติ หรือเซนเซอร์พัง
    if (isNaN(temp) || isNaN(hum) || rackData.status?.sensor !== "OK" || rackData.status?.wifi !== "OK") {
        return "ALERT";
    }

    // 2. เช็กระดับ ALERT (BAD) - หลุดจากช่วง 5-40°C หรือ 20-80%
    if (temp < 5 || temp > 40 || hum < 20 || hum > 80) {
        return "ALERT";
    }

    // 3. เช็กระดับ GOOD (ปกติสุดๆ) - อยู่ในเกณฑ์ 15-30°C และ 40-70%
    if (temp >= 15 && temp <= 30 && hum >= 40 && hum <= 70) {
        return "GOOD";
    }

    // 4. นอกเหนือจาก 2 และ 3 แปลว่าอยู่ในช่วง NORMAL แต่ไม่ถึงกับ GOOD -> ถือว่ามีความเสี่ยง
    return "WARNING";
}

// ===============================
// สร้างหน้าตาการ์ด Flex Message (Bubble)
// ===============================
function createRackFlexBubble(rackId, rackData, statusLevel) {
    const temp = rackData.current?.temperature || "--";
    const hum = rackData.current?.humidity || "--";
    const lastUpdate = rackData.status?.lastUpdateText || rackData.current?.datetime || "ไม่ระบุ";

    let headerColor, statusText;

    // กำหนดสีและข้อความตามสถานะ 3 ระดับ
    if (statusLevel === "ALERT") {
        headerColor = "#ef4444"; // สีแดง
        statusText = "⚠️ อุปกรณ์มีปัญหา (ALERT)";
    } else if (statusLevel === "WARNING") {
        headerColor = "#f59e0b"; // สีเหลืองอมส้ม
        statusText = "⚠️ มีความเสี่ยง (WARNING)";
    } else {
        headerColor = "#1e3a8a"; // สีน้ำเงิน (หรือเปลี่ยนเป็นเขียว #10b981 ได้)
        statusText = "✅ สถานะปกติ (GOOD)";
    }

    return {
        type: "bubble",
        size: "kilo",
        header: {
            type: "box",
            layout: "vertical",
            backgroundColor: headerColor,
            contents: [
                {
                    type: "text",
                    text: rackId,
                    color: "#ffffff",
                    weight: "bold",
                    size: "xl"
                },
                {
                    type: "text",
                    text: statusText,
                    color: "#ffffff",
                    size: "xs",
                    margin: "sm"
                }
            ]
        },
        body: {
            type: "box",
            layout: "vertical",
            spacing: "md",
            contents: [
                {
                    type: "box",
                    layout: "horizontal",
                    contents: [
                        { type: "text", text: "🌡️ อุณหภูมิ", color: "#555555", size: "sm", flex: 1 },
                        { type: "text", text: `${temp} °C`, color: "#111111", size: "md", weight: "bold", align: "end", flex: 1 }
                    ]
                },
                {
                    type: "box",
                    layout: "horizontal",
                    contents: [
                        { type: "text", text: "💧 ความชื้น", color: "#555555", size: "sm", flex: 1 },
                        { type: "text", text: `${hum} %RH`, color: "#111111", size: "md", weight: "bold", align: "end", flex: 1 }
                    ]
                },
                {
                    type: "separator",
                    margin: "md"
                },
                {
                    type: "box",
                    layout: "horizontal",
                    margin: "md",
                    contents: [
                        { type: "text", text: "🕒 อัปเดตล่าสุด", color: "#aaaaaa", size: "xs", flex: 1 },
                        { type: "text", text: lastUpdate, color: "#aaaaaa", size: "xs", align: "end", flex: 2 }
                    ]
                }
            ]
        }
    };
}

// ===============================
// 1. ระบบส่งสรุปทุก 6 ชั่วโมง (00:00, 06:00, 12:00, 18:00)
// ===============================
cron.schedule("0 0,6,12,18 * * *", async () => {
    console.log("ถึงเวลาส่งสรุปสถานะราย 6 ชั่วโมง...");
    try {
        const snapshot = await db.ref("racks").once("value");
        const racks = snapshot.val();
        if (!racks) return;

        const bubbles = [];
        for (const [rackId, rackData] of Object.entries(racks)) {
            const statusLevel = getRackStatusLevel(rackData);
            bubbles.push(createRackFlexBubble(rackId, rackData, statusLevel));
        }

        const carousel = {
            type: "carousel",
            contents: bubbles
        };

        await sendLineFlexMessage("📊 รายงานสรุปสถานะ Rack ทุก 6 ชั่วโมง", carousel);
    } catch (error) {
        console.error("Cron Error:", error);
    }
});

// ===============================
// 2. ระบบเฝ้าระวังแบบ Real-time (ทำงานเมื่อค่าเปลี่ยนระดับ)
// ===============================
const alertStateTracker = {}; // เก็บสถานะล่าสุด เช่น "GOOD", "WARNING", "ALERT"

db.ref("racks").on("value", (snapshot) => {
    const racks = snapshot.val();
    if (!racks) return;

    for (const [rackId, rackData] of Object.entries(racks)) {
        const currentLevel = getRackStatusLevel(rackData);
        const previousLevel = alertStateTracker[rackId];

        // ถ้าระบบเพิ่งเริ่มทำงาน (ยังไม่มีค่าใน Tracker)
        if (previousLevel === undefined) {
            alertStateTracker[rackId] = currentLevel;
            // แจ้งเตือนทันทีตอนเปิดเซิร์ฟเวอร์ ถ้าพบว่ามีอันตรายหรือความเสี่ยงค้างอยู่
            if (currentLevel === "ALERT" || currentLevel === "WARNING") {
                const flexContent = createRackFlexBubble(rackId, rackData, currentLevel);
                const pushText = currentLevel === "ALERT" ? `🚨 ระดับอันตราย! ${rackId} มีปัญหา` : `⚠️ แจ้งเตือน! ${rackId} มีความเสี่ยง`;
                sendLineFlexMessage(pushText, flexContent);
            }
            continue;
        }

        // ถ้าสถานะมีการเปลี่ยนแปลงจากเดิม (เช่น เปลี่ยนจาก GOOD -> WARNING)
        if (previousLevel !== currentLevel) {
            alertStateTracker[rackId] = currentLevel; // อัปเดตสถานะ

            const flexContent = createRackFlexBubble(rackId, rackData, currentLevel);
            let pushText = "";

            if (currentLevel === "ALERT") pushText = `🚨 ด่วน! พบความผิดปกติระดับอันตรายที่ ${rackId}`;
            else if (currentLevel === "WARNING") pushText = `⚠️ แจ้งเตือน! ${rackId} เปลี่ยนเป็นสถานะมีความเสี่ยง`;
            else pushText = `✅ ${rackId} กลับสู่สถานะปกติแล้ว`;

            sendLineFlexMessage(pushText, flexContent);
        }
    }
});

// ===============================
// Webhook สำหรับรับข้อความจากผู้ใช้
// ===============================
app.post("/webhook", async (req, res) => {
    res.status(200).send("OK");

    const events = req.body.events;
    if (!events || events.length === 0) return;

    for (const event of events) {
        if (event.type === "message" && event.message.type === "text") {
            const userMessage = event.message.text.trim();

            if (userMessage === "ดูข้อมูลปัจจุบัน" || userMessage === "RACK STATUS") {
                console.log("ได้รับคำสั่ง ดึงข้อมูลปัจจุบัน...");
                await sendReplyFlexMessage(event.replyToken);
            }
        }
    }
});

// ===============================
// ฟังก์ชันส่ง Reply Flex Message กลับไป
// ===============================
async function sendReplyFlexMessage(replyToken) {
    try {
        const snapshot = await db.ref("racks").once("value");
        const racks = snapshot.val();
        if (!racks) return;

        const bubbles = [];
        for (const [rackId, rackData] of Object.entries(racks)) {
            const statusLevel = getRackStatusLevel(rackData);
            bubbles.push(createRackFlexBubble(rackId, rackData, statusLevel));
        }

        const carousel = { type: "carousel", contents: bubbles };

        const response = await fetch("https://api.line.me/v2/bot/message/reply", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
            },
            body: JSON.stringify({
                replyToken: replyToken,
                messages: [{ type: "flex", altText: "📊 ข้อมูลสถานะ RACK ปัจจุบัน", contents: carousel }]
            })
        });

        if (response.ok) {
            console.log("✅ ส่งข้อมูลปัจจุบันกลับไปสำเร็จ!");
        } else {
            console.error("❌ ส่งข้อมูลล้มเหลว:", await response.text());
        }
    } catch (error) {
        console.error("Webhook Error:", error);
    }
}

// ===============================
// Start Server
// ===============================
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
});