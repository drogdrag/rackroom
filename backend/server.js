const express = require("express");
const admin = require("firebase-admin");
require("dotenv").config();

const app = express();

app.use(express.json());

// ========================================
// Firebase Admin
// ========================================

const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL:
        "https://rackroom-6e221-default-rtdb.asia-southeast1.firebasedatabase.app"
});

const db = admin.database();

console.log("Firebase Admin connected!");

// ========================================
// Test Backend
// ========================================

app.get("/", (req, res) => {
    res.send("Rack Room Backend is running!");
});

// ========================================
// Test Firebase
// ========================================

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

// ========================================
// Start Server
// ========================================

const PORT = 3000;

app.listen(PORT, () => {
    console.log(
        `Backend running at http://localhost:${PORT}`
    );
});