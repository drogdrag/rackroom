# Rack Room Monitoring System

ระบบตรวจสอบและติดตามอุณหภูมิและความชื้นภายในห้องแร็คเซิร์ฟเวอร์แบบเรียลไทม์ (Rack Room Monitoring System) พัฒนาขึ้นเพื่อช่วยดูแลสภาพแวดล้อมของอุปกรณ์ไอทีสำคัญ ลดความเสี่ยงจากความร้อนและความชื้นสูงที่อาจสร้างความเสียหายต่อระบบฮาร์ดแวร์

---

## 🚀 ฟีเจอร์เด่นของระบบ (Key Features)

* **Real-time Monitoring:** แสดงผลอุณหภูมิและความชื้นของตู้แร็คแต่ละตัวแบบเรียลไทม์ผ่านการเชื่อมต่อกับ Firebase Realtime Database
* **Interactive Dashboard:** หน้าจอภาพรวม (Overview Page) แสดงสรุปสถานะอุปกรณ์ทั้งหมด (Total, Online, Offline, Alert) พร้อมระบบกรองข้อมูลอัจฉริยะ (All, Online, Offline, Alert)
* **Detailed Rack View:** หน้าแสดงรายละเอียดรายตู้แร็ค พร้อมกราฟประวัติย้อนหลัง (Temperature & Humidity History) แบบ Dual-Canvas ที่รองรับการเลื่อนดูข้อมูลย้อนหลังได้อย่างลื่นไหล
* **Data Export:** รองรับการดาวน์โหลดข้อมูลประวัติย้อนหลังเป็นไฟล์ Excel (XLSX) แยกตามหมวดหมู่อุณหภูมิ ความชื้น หรือข้อมูลทั้งหมดได้ทันที
* **Custom Rack Naming:** สามารถแก้ไขและบันทึกชื่อเรียกของแต่ละ Rack ได้โดยตรงผ่านระบบ UI Pop-up ทันสมัย
* **Secure History Management:** มีปุ่มกดลบประวัติการวัดค่าเฉพาะของแต่ละ Rack ได้อย่างอิสระ พร้อมระบบ Custom Modal ยืนยันการทำงานเพื่อป้องกันความผิดพลาด
* **Line QR Code Integration:** ปุ่มลอย (Floating QR Button) มุมขวาล่างสำหรับสแกนเพื่อรับข้อมูลแจ้งเตือนผ่านช่องทาง LINE

---

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

* **Frontend:** HTML5, CSS3, JavaScript (ES6 Modules)
* **Charts & Data:** Chart.js, SheetJS (XLSX) สำหรับจัดการและส่งออกข้อมูล Excel
* **Backend & Database:** Firebase Realtime Database
* **UI/UX Design:** Modern Glassmorphism & Responsive Grid Layout พร้อมภาพพื้นหลังธีมโรงงานอุตสาหกรรม

---

## 📂 โครงสร้างโปรเจกต์ (Project Structure)

```text
rackroom-main/
├── index.html        # หน้าเว็บหลักของระบบ (Overview, Detail, Modals)
├── style.css         # ไฟล์จัดแต่งสไตล์ (UI, Cards, Charts layout, Animations)
├── app.js            # ไฟล์ควบคุมการทำงานหลัก (Firebase Connection, Charts, Events)
└── ptt.jpg           # รูปภาพพื้นหลัง (Watermark Background)

```

---

## ⚙️ การติดตั้งและใช้งาน (Installation & Setup)

1. โคลนหรือดาวน์โหลดโปรเจกต์นี้มาไว้ในเครื่องคอมพิวเตอร์ของคุณ
2. เปิดโฟลเดอร์โปรเจกต์ผ่านโปรแกรม **Visual Studio Code (VS Code)**
3. ตรวจสอบการตั้งค่า Firebase Configuration ภายในไฟล์ `app.js` ให้ตรงกับโปรเจกต์ของคุณ
4. เปิดใช้งานผ่าน Live Server ใน VS Code เพื่อรันเว็บไซต์ หรือเปิดไฟล์ `index.html` บนเว็บบราวเซอร์ได้ทันที