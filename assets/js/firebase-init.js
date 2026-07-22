const firebaseConfig = {
  apiKey: "AIzaSyBuxMzfGyzPoq4yO6M8_BCVvnEyT-8XIe4",
  authDomain: "escala-vinicius-m.firebaseapp.com",
  projectId: "escala-vinicius-m",
  storageBucket: "escala-vinicius-m.appspot.com",
  messagingSenderId: "69262067102",
  appId: "1:69262067102:web:fc0392b1abaae69009c28f"
};

firebase.initializeApp(firebaseConfig);
window.db = firebase.firestore();
