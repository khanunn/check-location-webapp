// !!! นี่คือสคริปต์สำหรับ "Google Sheet" (ที่รับข้อมูลจาก Form)

// --- 1. ตั้งค่าตัวแปร (ต้องตรงกับไฟล์ HTML) ---
const TARGET_LATITUDE = 13.736717;
const TARGET_LONGITUDE = 100.523186;
const MAX_RADIUS_METERS = 500;

// !!! 1.1 ตั้งค่าคอลัมน์ใน Google Sheet (สำคัญมาก!)
// A=1, B=2, C=3...
// สมมติว่าคำถาม Latitude, Longitude, IP Address อยู่ในคอลัมน์ C, D, E
const ipColumnIndex = 5; // <-- !!! (ตัวอย่าง: คอลัมน์ E) เปลี่ยนเลขคอลัมน์นี้ให้ตรงกับ IP Address
const verificationColumnIndex = 6; // <-- !!! (ตัวอย่าง: คอลัมน์ F) คอลัมน์สำหรับแสดงผลลัพธ์

/**
 * @param {GoogleAppsScript.Events.SheetsOnFormSubmit} e
 */
function onFormSubmit(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const row = e.range.getRow(); 
  let verificationStatus = "ไม่ทราบสถานะ";

  if (!e || !e.namedValues) {
    Logger.log("สคริปต์ถูกรันโดยไม่มีข้อมูล");
    return;
  }

  // ดึงค่าที่ส่งมา
  // *** ชื่อ 'Latitude', 'Longitude', 'IP Address' ต้องตรงกับ "ชื่อคำถาม" ใน Google Form ***
  const submittedLat = e.namedValues['Latitude'] ? e.namedValues['Latitude'][0] : null;
  const submittedLong = e.namedValues['Longitude'] ? e.namedValues['Longitude'][0] : null;
  const submittedIP = e.namedValues['IP Address'] ? e.namedValues['IP Address'][0] : null;

  // --- 1. ตรวจสอบ IP ซ้ำก่อน (ป้องกันการโกง) ---
  if (submittedIP) {
    // ดึงค่า IP ทั้งหมดที่เคยส่งมาก่อน
    // (ตั้งแต่แถวที่ 2 จนถึงแถวก่อนหน้า)
    const lastRow = row - 1; 
    if (lastRow > 1) { // ถ้ามีข้อมูลเก่าให้ตรวจสอบ
      // getRange(แถวเริ่มต้น, คอลัมน์, จำนวนแถว, จำนวนคอลัมน์)
      // เราจะดึงข้อมูลตั้งแต่แถวที่ 2 (แถวแรกคือหัวข้อ) จนถึงแถวก่อนหน้า (lastRow)
      const ipRange = sheet.getRange(2, ipColumnIndex, lastRow - 1, 1).getValues(); 
      
      const isIPDuplicate = ipRange.some(ipArray => ipArray[0] === submittedIP);

      if (isIPDuplicate) {
        verificationStatus = `❌ IP ซ้ำ (${submittedIP})`;
        sheet.getRange(row, verificationColumnIndex).setValue(verificationStatus);
        Logger.log(`IP ซ้ำ: ${submittedIP} ในแถวที่ ${row}`);
        return; // หยุดการทำงานถ้า IP ซ้ำ
      }
    }
  } else {
     // ถ้าไม่มี IP ส่งมาเลย (แสดงว่าพยายามเข้า Form เปล่าๆ)
     verificationStatus = "❌ โกง (ไม่มี IP/พิกัด)";
     sheet.getRange(row, verificationColumnIndex).setValue(verificationStatus);
     Logger.log(`ไม่มี IP หรือพิกัดในแถวที่ ${row}`);
     return;
  }
  
  // --- 2. ตรวจสอบพิกัด (ถ้า IP ไม่ซ้ำ) ---
  if (!submittedLat || !submittedLong) {
    verificationStatus = "❌ โกง (ไม่มีพิกัด)";
  } else {
    // คำนวณระยะห่าง
    const distance = calculateDistance(
      parseFloat(submittedLat), 
      parseFloat(submittedLong), 
      TARGET_LATITUDE, 
      TARGET_LONGITUDE
    );

    if (distance <= MAX_RADIUS_METERS) {
      verificationStatus = `✅ ยืนยันแล้ว (IP: ${submittedIP})`;
    } else {
      verificationStatus = `❌ นอกพื้นที่ (ระยะห่าง ${distance.toFixed(0)} ม.)`;
    }
  }

  // เขียนผลลัพธ์สุดท้าย
  sheet.getRange(row, verificationColumnIndex).setValue(verificationStatus);
}

// --- 8. ฟังก์ชันยูทิลิตี้ (Haversine formula) ---
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // รัศมีโลก (เมตร)
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c; // ระยะห่าง (เมตร)
}

