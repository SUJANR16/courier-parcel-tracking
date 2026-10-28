const { applicationDefault, initializeApp, getApps } =
  require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

const projectId = "parceltrack-pro-1024e";
const uid = "SkNy3ymH0YaKste9LNag8bevUnp1";

async function main() {
  if (!getApps().length) {
    initializeApp({
      credential: applicationDefault(),
      projectId,
    });
  }

  const auth = getAuth();
  const user = await auth.getUser(uid);

  // Preserve any existing custom claims.
  await auth.setCustomUserClaims(uid, {
    ...user.customClaims,
    admin: true,
  });

  const updatedUser = await auth.getUser(uid);

  console.log("Admin claim assigned successfully.");
  console.log("UID:", updatedUser.uid);
  console.log("Admin claim:", updatedUser.customClaims?.admin === true);
}

main().catch((error) => {
  console.error("Could not assign admin claim:", error.message);
  process.exitCode = 1;
});