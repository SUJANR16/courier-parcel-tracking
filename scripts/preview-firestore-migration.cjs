const Database = require("../backend/node_modules/better-sqlite3");
const admin = require("../functions/node_modules/firebase-admin");
const { getFirestore } = require("../functions/node_modules/firebase-admin/lib/firestore");

const PROJECT_ID = "parceltrack-pro-1024e";
const DRY_RUN = true;

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: PROJECT_ID
});

const firestore = getFirestore();

const sources = [
  {
    file: "./backend/courier-tracking.db",
    table: "shipments",
    trackingField: "tracking_id",
    collection: "shipments",
    legacy: false
  },
  {
    file: "./backend/courier.db",
    table: "parcels",
    trackingField: "tracking_number",
    collection: "legacyParcels",
    legacy: true
  }
];

async function main() {
  let total = 0;

  for (const source of sources) {
    const sqlite = new Database(source.file, {
      readonly: true,
      fileMustExist: true
    });

    try {
      const rows = sqlite.prepare(
        `SELECT * FROM "${source.table}"`
      ).all();

      console.log(`\nSource: ${source.file}`);
      console.log(`Records found: ${rows.length}`);

      for (const row of rows) {
        total++;
        const trackingId = String(row[source.trackingField]);
        const ref = firestore.collection(source.collection).doc(trackingId);
        const existing = await ref.get();

        console.log(JSON.stringify({
          collection: source.collection,
          trackingId,
          firestoreDocumentExists: existing.exists,
          action: existing.exists ? "SKIP_EXISTING" : "WOULD_IMPORT",
          mode: DRY_RUN ? "DRY_RUN_NO_WRITES" : "WRITE_ENABLED"
        }));
      }
    } finally {
      sqlite.close();
    }
  }

  console.log(`\nTotal local records inspected: ${total}`);
  console.log("Dry run complete. No Firestore documents were written.");
}

main().catch(error => {
  console.error("Preview failed:", error.message);
  process.exitCode = 1;
});





