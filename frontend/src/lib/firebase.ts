
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDz75jon2opTKnMklhlr0sIO8MzXxCcsO0",
  authDomain: "parceltrack-pro-1024e.firebaseapp.com",
  projectId: "parceltrack-pro-1024e",
  storageBucket: "parceltrack-pro-1024e.firebasestorage.app",
  messagingSenderId: "160554436910",
  appId: "1:160554436910:web:b1296065889194f4be12bf",
  measurementId: "G-V1DRBJEJ2P",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export default app;
