const auth = firebase.auth();
const db = firebase.database();

document.getElementById("loginForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const selectedRole = document.getElementById("role").value;
  const errorDisplay = document.getElementById("error");

  errorDisplay.textContent = ""; // Clear previous errors

  auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      const user = userCredential.user;

      // Check role in Realtime Database
      return db.ref("users").once("value").then((snapshot) => {
        let matched = false;

        snapshot.forEach((child) => {
          const userData = child.val();
          if (userData.email === email && userData.role === selectedRole) {
            matched = true;
            // Stop iterating early
            return true; // forEach cannot break, but returning true here does nothing, so we use a flag instead
          }
        });

        if (matched) {
          localStorage.setItem("userRole", selectedRole);
          if (selectedRole === "doctor") {
            window.location.href = "doctor_dashboard.html";
          } else {
            window.location.href = "receptionist_dashboard.html";
          }
        } else {
          auth.signOut();
          errorDisplay.textContent = "❌ Role mismatch or user not registered correctly.";
        }
      });
    })
    .catch((error) => {
      errorDisplay.textContent = "❌ Login failed: " + error.message;
    });
});
