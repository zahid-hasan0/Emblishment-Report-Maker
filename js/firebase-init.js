

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-analytics.js";

const firebaseConfig = {
    apiKey: "AIzaSyAYi7iZPhSWpZP9JFda8WREaLQ6mZHksjY",
    authDomain: "item-notes.firebaseapp.com",
    projectId: "item-notes",
    storageBucket: "item-notes.firebasestorage.app",
    messagingSenderId: "937625064892",
    appId: "1:937625064892:web:c73a10c2e747cf8fb847b9",
    measurementId: "G-QHHV6X5XE6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
