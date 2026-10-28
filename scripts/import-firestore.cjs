const Database = require("../backend/node_modules/better-sqlite3");
const admin = require("../functions/node_modules/firebase-admin");
const { getFirestore } = require("../functions/node_modules/firebase-admin/lib/firestore");

const PROJECT_ID = "parceltrack-pro-1024e";

// Safety checks: this script must target cloud Firestore, not an emulator.
if (process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error("Firestore emulator detected. Import stopped for safety.");
}

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
    collection: "shipments"
  },
  {
    file: "./backend/courier.db",
    table: "parcels",
    trackingField: "tracking_number",
    collection: "legacyParcels"
  }
];

async function main() {
  let created = 0;
  let skipped = 0;
  let failed = 0;

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
        const trackingId = String(row[source.trackingField] ?? "").trim();

        if (!trackingId) {
          console.error("SKIPPED: record has no tracking ID.");
          skipped++;
          continue;
        }

        const ref = firestore.collection(source.collection).doc(trackingId);

        try {
          // Atomic create: will never overwrite a document that already exists.
          await ref.create(row);
          console.log(`CREATED: ${source.collection}/${trackingId}`);
          created++;
        } catch (error) {
          if (
            error.code === 6 ||
            error.code === "already-exists" ||
            error.code === "ALREADY_EXISTS"
          ) {
            console.log(`SKIPPED EXISTING: ${source.collection}/${trackingId}`);
            skipped++;
          } else {
            console.error(
              `FAILED: ${source.collection}/${trackingId} — ${error.message}`
            );
            failed++;
          }
        }
      }
    } finally {
      sqlite.close();
    }
  }

  console.log("\n=== IMPORT SUMMARY ===");
  console.log(`Created: ${created}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch(error => {
    console.error("Import stopped:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await admin.app().delete();
    } catch {}
  });
