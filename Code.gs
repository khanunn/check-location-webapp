//13.927301, 100.389257 บ้าน
//13.755956, 100.492430 กองอำนวยการสนามหลวง
//13.8766,  100.4044 ที่อยู่ localhost
const TARGET_LATITUDE = 13.755956;
const TARGET_LONGITUDE = 100.49243;
const MAX_RADIUS_METERS = 500;

const ipColumnIndex = 14;
const phoneColumnIndex = 4;
const nameColumnIndex = 3;
const verificationColumnIndex = 15;

/**
 * @param {GoogleAppsScript.Events.SheetsOnFormSubmit} e
 */
function onFormSubmit(e) {
  // --- [เพิ่ม Logger] ---
  console.log("--- เริ่มการทำงาน onFormSubmit ---");

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const row = e.range.getRow();
  let verificationStatus = "ไม่ทราบสถานะ";

  // ตั้งค่า Timezone เป็น "Asia/Bangkok" (GMT+7)
  const timezone = "Asia/Bangkok";
  const today = Utilities.formatDate(new Date(), timezone, "yyyy-MM-dd");

  // --- [เพิ่ม Logger] ---
  console.log(`แถวที่: ${row}, วันที่ปัจจุบัน (Today): ${today}`);

  if (!e || !e.namedValues) {
    console.log(
      "!!! Error: สคริปต์ถูกรันโดยไม่มีข้อมูล (e.namedValues is null)"
    );
    return;
  }

  // --- ดึงค่าที่ส่งมา ---
  const submittedLat = e.namedValues["Latitude"]
    ? e.namedValues["Latitude"][0]
    : null;
  const submittedLong = e.namedValues["Longitude"]
    ? e.namedValues["Longitude"][0]
    : null;
  const submittedIP = e.namedValues["IP Address"]
    ? e.namedValues["IP Address"][0]
    : null;
  const submittedPhone = e.namedValues["หมายเลขโทรศัพท์"]
    ? e.namedValues["หมายเลขโทรศัพท์"][0]
    : null;
  const submittedName = e.namedValues["ชื่อ-สกุล"]
    ? e.namedValues["ชื่อ-สกุล"][0]
    : null;

  // --- [เพิ่ม Logger] ---
  console.log(`IP ที่ส่งมา: ${submittedIP}, เบอร์ที่ส่งมา: ${submittedPhone}`);

  // --- 1. ตรวจสอบว่ามีข้อมูลหลัก (IP/พิกัด) หรือไม่ ---
  if (!submittedIP || !submittedLat || !submittedLong) {
    verificationStatus = "❌ โกง (ไม่มี IP/พิกัด)";
    sheet.getRange(row, verificationColumnIndex).setValue(verificationStatus);
    console.log(`!!! Error: ข้อมูลหลักไม่ครบ (IP/Lat/Lng)`);
    return;
  }

  // --- 2. ตรวจสอบ IP ซ้ำ (เฉพาะวันนี้) ---
  const lastRow = row - 1;
  if (lastRow > 1) {
    console.log(`เริ่มตรวจสอบข้อมูลเก่า (แถว 2 ถึง ${lastRow})`);
    const dataRange = sheet
      .getRange(2, 1, lastRow - 1, sheet.getLastColumn())
      .getValues();

    const todaysEntries = dataRange.filter((entryRow) => {
      const entryTimestamp = entryRow[0]; // คอลัมน์แรก (index 0) คือ Timestamp

      // --- [เพิ่ม Logger] ---
      // console.log(` - (แถวเก่า) Timestamp ดิบ: ${entryTimestamp}, ประเภท: ${typeof entryTimestamp}`);

      const entryDate = Utilities.formatDate(
        entryTimestamp,
        timezone,
        "yyyy-MM-dd"
      );

      // --- [เพิ่ม Logger] ---
      // (เปิดใช้อันนี้ถ้าต้องการดูทุกแถวที่มันกรอง)
      // console.log(`   - (แถวเก่า) entryDate: ${entryDate} | today: ${today} | IsMatch: ${entryDate === today}`);

      return entryDate === today;
    });

    console.log(`พบ ${todaysEntries.length} รายการที่ตรงกับ "วันนี้"`);

    const duplicateEntry = todaysEntries.find((entryRow) => {
      const entryIP = entryRow[ipColumnIndex - 1];
      // console.log(`   - กำลังเทียบ IP: ${entryIP} (เก่า) vs ${submittedIP} (ใหม่)`);
      return entryIP === submittedIP;
    });

    if (duplicateEntry) {
      console.log(`!!! พบ IP ซ้ำในวันนี้ !!!`);
      const duplicatePhone = duplicateEntry[phoneColumnIndex - 1];
      const duplicateName = duplicateEntry[nameColumnIndex - 1] || "ไม่พบชื่อ";
      console.log(
        `  - เบอร์ที่ซ้ำ: ${duplicatePhone}, ชื่อที่ซ้ำ: ${duplicateName}`
      );

      if (duplicatePhone === submittedPhone) {
        verificationStatus = `❌ IP ซ้ำ (ตัวเอง)`;
      } else {
        verificationStatus = `❌ IP ซ้ำ (${duplicateName})`;
      }

      sheet.getRange(row, verificationColumnIndex).setValue(verificationStatus);
      console.log(`จบการทำงาน: ${verificationStatus}`);
      return;
    } else {
      console.log(`ไม่พบ IP ซ้ำในวันนี้`);
    }
  }

  // --- 3. ตรวจสอบพิกัด (ถ้า IP ไม่ซ้ำในวันนี้) ---
  console.log(`กำลังตรวจสอบพิกัด...`);
  const distance = calculateDistance(
    parseFloat(submittedLat),
    parseFloat(submittedLong),
    TARGET_LATITUDE,
    TARGET_LONGITUDE
  );

  if (distance <= MAX_RADIUS_METERS) {
    verificationStatus = `✅ ยืนยืนแล้ว (IP: ${submittedIP})`;
  } else {
    verificationStatus = `❌ นอกพื้นที่ (ระยะห่าง ${distance.toFixed(0)} ม.)`;
  }

  console.log(`ผลการตรวจสอบพิกัด: ${verificationStatus}`);
  sheet.getRange(row, verificationColumnIndex).setValue(verificationStatus);
  console.log("--- จบการทำงาน onFormSubmit ---");
}

// --- 8. ฟังก์ชันยูทิลิตี้ (Haversine formula) ---
function calculateDistance(lat1, lon1, lat2, lon2) {
  // (โค้ดส่วนนี้เหมือนเดิม)
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
