
const firebaseConfig = {
    apiKey: "AIzaSyAYi7iZPhSWpZP9JFda8WREaLQ6mZHksjY",
    authDomain: "item-notes.firebaseapp.com",
    projectId: "item-notes",
    storageBucket: "item-notes.firebasestorage.app",
    messagingSenderId: "937625064892",
    appId: "1:937625064892:web:c73a10c2e747cf8fb847b9",
    measurementId: "G-QHHV6X5XE6"
};

// Check if Firebase SDK is loaded
if (typeof firebase === 'undefined') {
    console.error("CRITICAL ERROR: Firebase SDK not loaded. Check script order in HTML.");
    if (typeof showToast === 'function') {
        showToast("Firebase SDK missing!", "danger");
    }
} else {
    // Initialize only if not already initialized
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log("Firebase initialized successfully.");
    } else {
        console.log("Firebase already initialized.");
    }
}


const db = firebase.firestore();
const REPORTS_COLLECTION = "emb job storage";
