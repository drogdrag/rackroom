const express = require("express");
const { initializeApp, cert } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");
const cron = require("node-cron"); // เพิ่มไลบรารีตั้งเวลา
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
                        altText: altText, // ข้อความที่จะแสดงในหน้าพรีวิวแชท
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
// สร้างหน้าตาการ์ด Flex Message (Bubble)
// ===============================
function createRackFlexBubble(rackId, rackData, isAlert = false) {
    const temp = rackData.current?.temperature || "--";
    const hum = rackData.current?.humidity || "--";

    // ดึงเวลาล่าสุดจากข้อมูลใน Firebase (ถ้าไม่มีให้แสดงว่า "ไม่ระบุ")
    const lastUpdate = rackData.status?.lastUpdateText || rackData.current?.datetime || "ไม่ระบุ";

    const headerColor = isAlert ? "#ef4444" : "#1e3a8a";
    const statusText = isAlert ? "⚠️ อุปกรณ์มีปัญหา (ALERT)" : "✅ สถานะปกติ (NORMAL)";

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
                // เพิ่มเส้นคั่น
                {
                    type: "separator",
                    margin: "md"
                },
                // เพิ่มกล่องแสดงเวลาอัปเดตล่าสุด
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
// ฟังก์ชันตรวจสอบสถานะว่าสมควร Alert หรือไม่
// ===============================
function isRackInAlert(rackData) {
    if (!rackData || !rackData.current) return false;

    const temp = Number(rackData.current.temperature);
    const hum = Number(rackData.current.humidity);

    // 1. เช็กข้อมูลผิดปกติ (ไม่มีค่า หรืออ่านค่าไม่ได้)
    if (isNaN(temp) || isNaN(hum)) return true;

    // 2. เงื่อนไข Alert (ระดับ BAD: อยู่นอกช่วง NORMAL)
    // NORMAL: Temp 5-40°C และ RH 20-80%
    if (temp < 5 || temp > 40 || hum < 20 || hum > 80) {
        return true;
    }

    // 3. เช็กสถานะการเชื่อมต่อเซนเซอร์และ WiFi
    if (rackData.status?.sensor !== "OK" || rackData.status?.wifi !== "OK") {
        return true;
    }

    return false;
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
            const alertStatus = isRackInAlert(rackData);
            bubbles.push(createRackFlexBubble(rackId, rackData, alertStatus));
        }

        // จับมัดรวมเป็น Carousel (เลื่อนซ้ายขวาได้)
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
// 2. ระบบเฝ้าระวังแบบ Real-time (ส่งทันทีที่มี Alert)
// ===============================
// ใช้ตัวแปรเก็บสถานะเพื่อป้องกันไม่ให้มันส่ง LINE ซ้ำๆ ทุกวินาทีที่ค่าเปลี่ยน แต่อยู่ในเกณฑ์เสียเหมือนเดิม
const alertStateTracker = {};

db.ref("racks").on("value", (snapshot) => {
    const racks = snapshot.val();
    if (!racks) return;

    for (const [rackId, rackData] of Object.entries(racks)) {
        const currentlyInAlert = isRackInAlert(rackData);

        // ถ้ารอบที่แล้วปกติ (หรือยังไม่มีข้อมูล) แล้วรอบนี้พัง -> ส่ง LINE แจ้งเตือน!
        if (currentlyInAlert && !alertStateTracker[rackId]) {
            alertStateTracker[rackId] = true; // บันทึกว่าเสียแล้ว จะได้ไม่ส่งซ้ำ

            const flexContent = createRackFlexBubble(rackId, rackData, true);
            sendLineFlexMessage(`🚨 ด่วน! พบความผิดปกติที่ ${rackId}`, flexContent);
        }
        // ถ้ารอบนี้กลับมาเป็นปกติแล้ว -> รีเซ็ตสถานะ
        else if (!currentlyInAlert && alertStateTracker[rackId]) {
            alertStateTracker[rackId] = false;

            const flexContent = createRackFlexBubble(rackId, rackData, false);
            sendLineFlexMessage(`✅ ${rackId} กลับสู่สถานะปกติแล้ว`, flexContent);
        }
    }
});
// ===============================
// Webhook สำหรับรับข้อความจากผู้ใช้
// ===============================
app.post("/webhook", async (req, res) => {
    res.status(200).send("OK"); // ตอบกลับ LINE ทันที

    const events = req.body.events;
    if (!events || events.length === 0) return;

    for (const event of events) {
        if (event.type === "message" && event.message.type === "text") {
            const userMessage = event.message.text.trim();

            // เช็คว่าผู้ใช้กดปุ่มส่งคำว่าอะไรมา
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
            const alertStatus = isRackInAlert(rackData);
            bubbles.push(createRackFlexBubble(rackId, rackData, alertStatus));
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
