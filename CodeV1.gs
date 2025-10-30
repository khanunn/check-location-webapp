//13.927301, 100.389257 บ้าน
//13.755956, 100.492430 กองอำนวยการสนามหลวง
const TARGET_LATITUDE = 13.755956;
const TARGET_LONGITUDE = 100.49243;
const MAX_RADIUS_METERS = 500;

const ipColumnIndex = 14;
const verificationColumnIndex = 15;

/**
 * @param {GoogleAppsScript.Events.SheetsOnFormSubmit} e
 */
function onFormSubmit(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const row = e.range.getRow();
  let verificationStatus = "ไม่ทราบสถานะ";

  if (!e || !e.namedValues) {
    Logger.log("สคริปต์ถูกรันโดยไม่มีข้อมูล (อาจจะรันด้วยมือ)");
    return;
  }

  const submittedLat = e.namedValues["Latitude"]
    ? e.namedValues["Latitude"][0]
    : null;
  const submittedLong = e.namedValues["Longitude"]
    ? e.namedValues["Longitude"][0]
    : null;
  const submittedIP = e.namedValues["IP Address"]
    ? e.namedValues["IP Address"][0]
    : null;

  if (!submittedLat || !submittedLong) {
    verificationStatus = "โกง (ไม่มีพิกัด)";
  } else {
    const distance = calculateDistance(
      parseFloat(submittedLat),
      parseFloat(submittedLong),
      TARGET_LATITUDE,
      TARGET_LONGITUDE
    );

    if (distance <= MAX_RADIUS_METERS) {
      verificationStatus = "ยืนยันแล้ว (ในพื้นที่)";
    } else {
      verificationStatus = `โกง (นอกพื้นที่ - ${distance.toFixed(0)} ม.)`;
    }
  }

  sheet.getRange(row, verificationColumnIndex).setValue(verificationStatus);
  //sheet.getRange(row, verificationColumnIndex + 1).setValue(new Date());
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
