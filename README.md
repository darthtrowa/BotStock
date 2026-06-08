# BotStock 📈🤖

BotStock เป็นแอปพลิเคชันจำลองการเทรดหุ้นไทย (Market Simulator) ที่มาพร้อมกับระบบ AI Bot อัจฉริยะ ซึ่งสามารถสแกนหุ้น วิเคราะห์ทางเทคนิค และเรียนรู้เพื่อปรับกลยุทธ์การเทรดได้ด้วยตัวเอง

แอปพลิเคชันนี้พัฒนาด้วย **React**, **TypeScript**, **Vite** และรัน API Backend ด้วย **Node.js (Express)** ผสานพลังของ **Google Gemini AI** ในการช่วยตัดสินใจ

## ✨ ฟีเจอร์หลัก (Key Features)

- **📊 Dashboard & Portfolio Management**: ติดตามภาพรวมของพอร์ตการลงทุนแยกกันระหว่างผู้ใช้งาน (User Portfolio) และบอท (Bot Portfolio) อัปเดตมูลค่าแบบเรียลไทม์
- **🤖 AI Trading Bot & Scanner**: บอทสามารถสแกนหุ้นในตลาด (SET) และสร้างสัญญาณซื้อขาย (Trading Signals) ตามเงื่อนไขทางเทคนิค (Breakout, RSI Oversold, MACD)
- **✨ Gemini AI Integration**: นำ Google Gemini มาช่วยวิเคราะห์ข้อมูลหุ้นและประเมินจังหวะเข้าซื้อ พร้อมให้คำอธิบายที่เข้าใจง่าย
- **🧠 Bot Learning Center**: ระบบวิวัฒนาการของบอท บอทจะนำผลการเทรดที่ผ่านมา (Win/Loss) มาเรียนรู้และปรับกลยุทธ์โดยอัตโนมัติ เช่น การปรับค่า Take Profit (TP), Stop Loss (SL) และความกล้าหาญในการเข้าซื้อ (RSI Threshold)
- **📋 Transaction History & Alerts**: บันทึกประวัติการซื้อขายทั้งหมดอย่างละเอียด และมีแผงแจ้งเตือนการทำงานของระบบ (System Alerts & Logs)

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

- **Frontend**: React 19, TypeScript, Vite
- **Backend**: Node.js, Express.js
- **AI Integration**: `@google/genai` (Google Gemini API)
- **Tools**: `concurrently` (สำหรับรันเซิร์ฟเวอร์และไคลเอนต์พร้อมกัน), `eslint`

## 🚀 การติดตั้งและการใช้งาน (Installation & Usage)

1. **โคลนโปรเจกต์**
   ```bash
   git clone <your-repository-url>
   cd BotStock
   ```

2. **ติดตั้ง Dependencies**
   ```bash
   npm install
   ```

3. **ตั้งค่า Environment Variables**
   คัดลอก หรือ สร้างไฟล์ `.env` ที่ root ของโปรเจกต์ และใส่ Gemini API Key ของคุณ:
   ```env
   GEMINI_API_KEY=your_api_key_here
   PORT=3000
   ```

4. **เริ่มต้นการทำงาน (Start the App)**
   คุณสามารถใช้สคริปต์ที่เตรียมไว้ให้ หรือใช้คำสั่ง npm:
   
   รันผ่าน npm (จะเปิดทั้ง API server และ React ฝั่ง frontend):
   ```bash
   npm run dev
   ```

   สำหรับผู้ใช้ Windows สามารถรันผ่านสคริปต์:
   - ดับเบิ้ลคลิก `start.bat` หรือ
   - รันผ่าน PowerShell `./start.ps1`

5. **เปิดใช้งานบนเบราว์เซอร์**
   แอปจะเปิดใช้งานโดยปริยายที่ `http://localhost:5173/`

## 📂 โครงสร้างโปรเจกต์ที่สำคัญ (Folder Structure)

- `src/` - ซอร์สโค้ดฝั่งแอปพลิเคชัน React
  - `components/` - ส่วนประกอบ UI เช่น Dashboard, TradingSignals, BotLearningCenter ฯลฯ
  - `App.tsx` - ไฟล์หลักที่ควบคุม State ทั่วทั้งแอป (Portfolios, Signals, Market Simulator)
  - `types.ts` - นิยาม Type สำหรับ TypeScript
- `server.mjs` - เซิร์ฟเวอร์ Express สำหรับดึงข้อมูลและเรียก API AI
- `start.bat` / `start.ps1` - สคริปต์เริ่มต้นโปรเจกต์อย่างรวดเร็ว

## 📜 License
MIT License
