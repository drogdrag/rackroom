require("dotenv").config();
const fs = require("fs");

async function getLineToken() {
    const channelId = process.env.LINE_CHANNEL_ID;
    const channelSecret = process.env.LINE_CHANNEL_SECRET;

    if (!channelId || !channelSecret) {
        throw new Error(
            "ไม่พบ LINE_CHANNEL_ID หรือ LINE_CHANNEL_SECRET ใน .env"
        );
    }

    const response = await fetch(
        "https://api.line.me/v2/oauth/accessToken",
        {
            method: "POST",
            headers: {
                "Content-Type":
                    "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({
                grant_type: "client_credentials",
                client_id: channelId,
                client_secret: channelSecret
            })
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            `LINE Token Error ${response.status}: ${JSON.stringify(data)}`
        );
    }

    console.log("ออก LINE Access Token สำเร็จ!");
    console.log(
        `Token อายุประมาณ ${Math.floor(data.expires_in / 86400)} วัน`
    );

    // อ่าน .env เดิม
    let env = fs.readFileSync(".env", "utf8");

    // ลบ LINE_CHANNEL_ACCESS_TOKEN เดิม
    env = env.replace(
        /^LINE_CHANNEL_ACCESS_TOKEN=.*$/m,
        `LINE_CHANNEL_ACCESS_TOKEN=${data.access_token}`
    );

    // ถ้ายังไม่มีบรรทัด LINE_CHANNEL_ACCESS_TOKEN
    if (!env.includes("LINE_CHANNEL_ACCESS_TOKEN=")) {
        env += `\nLINE_CHANNEL_ACCESS_TOKEN=${data.access_token}\n`;
    }

    fs.writeFileSync(".env", env);

    console.log("บันทึก Token ใหม่ลงใน .env แล้ว");
}

getLineToken().catch((error) => {
    console.error(error.message);
});