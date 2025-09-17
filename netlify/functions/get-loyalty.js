const { NetlifyBlobClient } = require("@netlify/blobs");
const csv = require("csv-parser");
const { Readable } = require("stream");

exports.handler = async () => {
  try {
    const client = new NetlifyBlobClient({ siteID: process.env.SITE_ID });
    const blob = await client.get("contacts/contacts.csv");
    if (!blob) {
      return {
        statusCode: 404,
        body: JSON.stringify({ ok: false, error: "contacts.csv not found" }),
      };
    }

    const csvData = blob.toString();
    const rows = await parseCSV(csvData);

    const data = rows.map((row, index) => {
      const lastName = row["Last Name"]?.trim() || "";
      const firstName = row["First Name"]?.trim() || "";
      const points = parseInt(row["Rewards"], 10) || 0;
      const lastPurchase = row["Last Purchase"]?.trim() || "";
      const locker = row["Locker"]?.trim() || "";
      const military = normalizeFlag(row["Military"]);
      const responder = normalizeFlag(row["First Responder"]);

      return {
        id: index + 1,
        first_name: firstName,
        last_name: lastName,
        points,
        last_purchase: lastPurchase,
        locker,
        badges: {
          military,
          responder,
          locker: locker !== "" ? true : false,
        },
        email: row["Email"] || "",
        phone: row["Phone"] || "",
        company: row["Company"] || "",
        _raw: row,
      };
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, source: "blobs-csv", data }),
    };
  } catch (error) {
    console.error("Error loading loyalty data:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: error.message }),
    };
  }
};

// --- Helpers ---
function parseCSV(csvString) {
  return new Promise((resolve, reject) => {
    const results = [];
    const stream = Readable.from(csvString);
    stream
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", () => resolve(results))
      .on("error", (err) => reject(err));
  });
}

function normalizeFlag(value) {
  if (!value) return false;
  const normalized = value.toString().trim().toLowerCase();
  return ["y", "yes", "true", "1", "x"].includes(normalized);
}
