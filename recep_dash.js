if (localStorage.getItem("userRole") !== "receptionist") {
  window.location.href = "index.html";
}

const db = firebase.database();
const form = document.getElementById("visitorForm");
const tableBody = document.querySelector("#visitorTable tbody");
const message = document.getElementById("message");
const registerBtn = document.getElementById("registerBtn");

let returningVisitorData = null;

// Detect returning visitor by name input
document.getElementById("visitorName").addEventListener("input", (e) => {
  const typedName = e.target.value.trim().toLowerCase();
  if (!typedName) return hidePrompt();

  db.ref("visitors").once("value", (snapshot) => {
    let matchFound = false;
    snapshot.forEach((child) => {
      const data = child.val();
      if (data.name.toLowerCase() === typedName) {
        returningVisitorData = data;
        showPrompt(data);
        matchFound = true;
      }
    });
    if (!matchFound) hidePrompt();
  });
});

function showPrompt(data) {
  const box = document.getElementById("returningVisitorPrompt");
  const preview = document.getElementById("visitorPreview");
  box.style.display = "block";
  preview.innerHTML = `
    <strong>Name:</strong> ${data.name}<br>
    <strong>Phone:</strong> ${data.phone}<br>
    <strong>Email:</strong> ${data.email}<br>
    <strong>Age:</strong> ${data.age}<br>
    <strong>Sex:</strong> ${data.sex}
  `;
}

function hidePrompt() {
  document.getElementById("returningVisitorPrompt").style.display = "none";
  returningVisitorData = null;
}

function acceptReturningVisitor() {
  const data = returningVisitorData;
  document.getElementById("visitorPhone").value = data.phone;
  document.getElementById("visitorEmail").value = data.email;
  document.getElementById("visitorAge").value = data.age;
  document.getElementById("visitorSex").value = data.sex;
  hidePrompt();
}

function declineReturningVisitor() {
  returningVisitorData = null;
  document.getElementById("visitorPhone").value = "";
  document.getElementById("visitorEmail").value = "";
  document.getElementById("visitorAge").value = "";
  document.getElementById("visitorSex").value = "";
  hidePrompt();
}

//alert to next visitor by docotr
db.ref("alerts/nextVisitor").on("value", (snapshot) => {
  const alertData = snapshot.val();
  if (alertData && alertData.message) {
    alert(`${alertData.message}`);
    // Optionally clear the message after showing it once
    db.ref("alerts/nextVisitor").remove();
  }
});


// Register new visitor (no tokenAmount)
registerBtn.addEventListener("click", () => {
  const visitorData = getFormData(false); // no token
  if (!visitorData) return;

  db.ref("visitors").push(visitorData).then(() => {
    message.textContent = "✅ Visitor registered successfully!";
    setTimeout(() => (message.textContent = ""), 3000);
    form.reset();
  }).catch(err => alert("❌ Error: " + err.message));
});

// Log visit entry (with token only in visitLogs)
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const visitorData = getFormData(true); // with token
  if (!visitorData) return;

  db.ref("visitLogs").push(visitorData).then(() => {
    message.textContent = "✅ Visitor logged successfully!";
    setTimeout(() => (message.textContent = ""), 3000);
    form.reset();
    loadVisitors();
  }).catch(err => alert("❌ Error: " + err.message));
});

// Get data from form
function getFormData(includeToken) {
  const name = document.getElementById("visitorName").value.trim();
  const phone = document.getElementById("visitorPhone").value.trim();
  const email = document.getElementById("visitorEmail").value.trim();
  const age = parseInt(document.getElementById("visitorAge").value.trim());
  const sex = document.getElementById("visitorSex").value;
  const token = parseInt(document.getElementById("tokenAmount").value.trim());

  if (!name || !phone || !email || isNaN(age) || !sex || (includeToken && isNaN(token))) {
    alert("Please fill in all fields correctly.");
    return null;
  }

  const data = {
    name, phone, email, age, sex,
    timestamp: new Date().toLocaleString()
  };

  if (includeToken) data.tokenAmount = token;
  return data;
}

// Load visit logs
function loadVisitors() {
  db.ref("visitLogs").once("value", (snapshot) => {
    tableBody.innerHTML = "";
    let count = 1;

    snapshot.forEach((child) => {
      const data = child.val();
      const key = child.key;
      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${count++}</td>
        <td>${data.name}</td>
        <td>${data.phone}</td>
        <td>${data.email}</td>
        <td>${data.age}</td>
        <td>${data.sex}</td>
        <td>${data.tokenAmount || "-"}</td>
        <td>${data.timestamp}</td>
        <td>${data.prescription ? `
          Med: ${data.prescription.medicine}<br>
          Qty: ${data.prescription.quantity}<br>
          Usage: ${data.prescription.usage}<br>
          <em>${data.prescription.timestamp}</em>` : "Not Provided"}
          </td>
         <td>
         <button onclick="deleteVisitLog('${key}')" style="color:White;background-color:Red;">Delete</button>
         </td>
      `;

      tableBody.appendChild(row);
    });
  });
}

// Send to doctor by token
function sendInVisitors() {
  const token = parseInt(document.getElementById("sendInToken").value.trim());
  if (isNaN(token)) return alert("Please enter a valid token number.");

  db.ref("visitLogs").once("value", (snapshot) => {
    const matches = [];
    snapshot.forEach((child) => {
      const data = child.val();
      if (data.tokenAmount === token) {
        matches.push(data);
      }
    });

    if (matches.length === 0) {
      return alert("❌ No visitors found with that token number.");
    }

    db.ref("sentToDoctor").push(matches).then(() => {
      alert("✅ Visitors sent to doctor successfully.");
      document.getElementById("sendInToken").value = "";
    });
  });
}

function deleteVisitLog(key) {
  if (confirm("Are you sure you want to delete this visit log?")) {
    db.ref("visitLogs/" + key).remove()
      .then(() => {
        alert("✅ Visit log deleted.");
        loadVisitors();
      })
      .catch((error) => {
        alert("❌ Error deleting visit log: " + error.message);
      });
  }
}


// Logout
function logout() {
  firebase.auth().signOut().then(() => {
    localStorage.removeItem("userRole");
    window.location.href = "index.html";
  });
}

function loadAllRegisteredVisitors() {
  const section = document.getElementById("allRegisteredVisitorsSection");
  const table = document.getElementById("registeredVisitorTable");
  const tbody = table.querySelector("tbody");
  tbody.innerHTML = "";

  firebase.database().ref("visitors").once("value", snapshot => {
    let index = 1;
    snapshot.forEach(child => {
      const data = child.val();

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${index++}</td>
        <td>${data.name}</td>
        <td>${data.phone}</td>
        <td>${data.email}</td>
        <td>${data.age}</td>
        <td>${data.sex}</td>
        <td>${data.timestamp || "-"}</td>
      `;
      tbody.appendChild(row);
    });

    section.style.display = "block";
  });
}

function closeAllRegisteredVisitors() {
  document.getElementById("allRegisteredVisitorsSection").style.display = "none";
}


loadVisitors();
