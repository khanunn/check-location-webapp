function doPost(e) {
  console.log("=== doPost Triggered === (Received POST request)");

  let response;
  const cacheSec = 60;

  try {
    const data = e.parameter;
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
      ]);

      cache.put(cacheKey, "locked", cacheSec);
      console.log("Data appended. Lock set for IP: " + userIp);

      response = { status: "success", message: "Data saved successfully." };
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
