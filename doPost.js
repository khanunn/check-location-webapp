//13.927301, 100.389257 บ้าน
//13.755956, 100.492430 กองอำนวยการสนามหลวง
//13.8766,  100.4044 ที่อยู่ localhost
const TARGET_LATITUDE = 13.755956;
const TARGET_LONGITUDE = 100.49243;
const MAX_RADIUS_METERS = 500;

const deviceIdColumnIndex = 10;
const verificationColumnIndex = 11;

let dupplicateDeviceName = "";

function doPost(e) {
  console.log("=== doPost Triggered === (Received POST request)");

  let response;
  let verificationStatus = "ไม่ทราบสถานะ";
  const cacheSec = 60;

  try {
    const data = e.parameter;
    const submittedLat = (data.location || "").split(",")[0].trim();
    const submittedLong = (data.location || "").split(",")[1].trim();
    console.log("POST Data (Parsed from e.parameter): " + JSON.stringify(data));

    const cache = CacheService.getScriptCache();
    const userIp = e.userIp;
    const cacheKey = "submit_lock_" + userIp;

    if (cache.get(cacheKey)) {
      console.log("Rate Limit Hit for IP: " + userIp);
      response = { status: "error", message: "ERROR_TOO_MANY_REQUESTS" };
    } else {
      console.log("Processing data for IP: " + userIp);
      const phone = data.phone ? "'" + data.phone : "";

      const sheet =
        SpreadsheetApp.getActiveSpreadsheet().getSheetByName("FormResponse");

      cache.put(cacheKey, "locked", cacheSec);
      console.log("Data appended. Lock set for IP: " + userIp);

      response = { status: "success", message: "Data saved successfully." };

      console.log("Starting verification process...");
      const distance = calculateDistance(
        parseFloat(submittedLat),
        parseFloat(submittedLong),
        TARGET_LATITUDE,
        TARGET_LONGITUDE
      );

      if (distance <= MAX_RADIUS_METERS) {
        verificationStatus = `✅ ในพื้นที่ (ระยะห่าง ${distance.toFixed(
          0
        )} ม.)`;
      } else {
        verificationStatus = `❌ นอกพื้นที่ (ระยะห่าง ${distance.toFixed(
          0
        )} ม.)`;
      }

      if (isDuplicateDeviceToday(sheet, data.device_id || "UNKNOWN_DEVICE")) {
        verificationStatus +=
          " | ❌ อุปกรณ์ซ้ำกับ (" + dupplicateDeviceName + ") ในวันนี้";
      }

      console.log(`Verification Status: ${verificationStatus}`);

      sheet.appendRow([
        new Date(),
        data.name,
        phone,
        data.position,
        data.department,
        data.specific_answer,
        data.time_range,
        data.area_responsible,
        data.location,
        data.device_id,
      ]);
      const lastRow = sheet.getLastRow();

      sheet
        .getRange(lastRow, verificationColumnIndex)
        .setValue(verificationStatus);
      console.log("--- จบการทำงาน onFormSubmit ---");
    }
  } catch (err) {
    console.log(
      "!!! ERROR in doPost !!!: " + err.message + " | Stack: " + err.stack
    );
    response = {
      status: "error",
      message: "GAS Runtime Error: " + err.message,
    };
  }

  const output = ContentService.createTextOutput(
    JSON.stringify(response)
  ).setMimeType(ContentService.MimeType.JSON);

  console.log("=== doPost Finished === (Sending final JSON response)");
  return output;
}

function isDuplicateDeviceToday(sheet, deviceId) {
  if (!deviceId || deviceId === "UNKNOWN_DEVICE") return false;

  const data = sheet.getDataRange().getValues();
  const todayStr = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    "yyyy-MM-dd"
  );

  const DATE_COL_INDEX = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowDateObj = new Date(row[DATE_COL_INDEX]);
    const rowDateStr = Utilities.formatDate(
      rowDateObj,
      Session.getScriptTimeZone(),
      "yyyy-MM-dd"
    );
    const rowDeviceId = String(row[deviceIdColumnIndex - 1]); // -1 cause array is 0-indexed

    if (rowDateStr === todayStr && rowDeviceId === deviceId) {
      dupplicateDeviceName = row[1]; // Assuming column 2 has the name
      return true;
    }
  }
  return false;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
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
