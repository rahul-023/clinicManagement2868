if (localStorage.getItem("userRole") !== "doctor") {
  window.location.href = "index.html";
}

const db = firebase.database();
const tableBody = document.querySelector("#doctorTable tbody");

function logout() {
  localStorage.removeItem("userRole");
  window.location.href = "index.html";
}

function loadSentVisitors() {
  db.ref("sentToDoctor").on("value", (snapshot) => {
    tableBody.innerHTML = "";

    snapshot.forEach((childSnapshot) => {
      const requestKey = childSnapshot.key;
      const visitors = childSnapshot.val() || [];

      if (!Array.isArray(visitors)) return;

      visitors.forEach((data, index) => {
        const row = document.createElement("tr");
        const visitorKey = `${data.name}-${data.phone}`.replace(/\s+/g, "_");

        row.innerHTML = `
          <td>${index + 1}</td>
          <td>${data.name}</td>
          <td>${data.phone}</td>
          <td>${data.email}</td>
          <td>${data.age}</td>
          <td>${data.sex}</td>
          <td>${data.tokenAmount ?? ""}</td>
          <td id="prev_${visitorKey}">Loading...</td>
          <td>
            Medicine: <input type="text" id="med_${visitorKey}" placeholder="Medicine Name" />
            Quantity: <input type="text" id="qty_${visitorKey}" placeholder="Quantity" />
            Usage: <input type="text" id="usage_${visitorKey}" placeholder="Usage Details" />
            <button onclick="sendPrescription('${data.name}', '${data.phone}')">Send</button>
          </td>
          <td><button onclick="deleteVisitorRequest('${requestKey}', ${index})">Delete Request</button></td>
        `;
        tableBody.appendChild(row);

        // Load previous prescriptions from visitLogs
        db.ref("visitLogs").once("value", (logsSnap) => {
          let latestPrescription = "None";

          logsSnap.forEach((log) => {
            const logData = log.val();
            if (logData.name === data.name && logData.phone === data.phone && logData.prescription) {
              latestPrescription = `
                Med: ${logData.prescription.medicine}<br>
                Qty: ${logData.prescription.quantity}<br>
                Usage: ${logData.prescription.usage}<br>
                <em>${logData.prescription.timestamp}</em>
              `;
            }
          });

          document.getElementById(`prev_${visitorKey}`).innerHTML = latestPrescription;
        });
      });
    });
  });
}

function sendPrescription(name, phone) {
  const visitorKey = `${name}-${phone}`.replace(/\s+/g, "_");
  const med = document.getElementById(`med_${visitorKey}`).value.trim();
  const qty = document.getElementById(`qty_${visitorKey}`).value.trim();
  const usage = document.getElementById(`usage_${visitorKey}`).value.trim();

  if (!med || !qty || !usage) {
    return alert("Please fill all prescription fields.");
  }

  db.ref("visitLogs").once("value", (snapshot) => {
    let updated = false;

    snapshot.forEach((child) => {
      const data = child.val();

      if (data.name === name && data.phone === phone) {
        db.ref("visitLogs/" + child.key).update({
          prescription: {
            medicine: med,
            quantity: qty,
            usage: usage,
            timestamp: new Date().toLocaleString()
          }
        });
        updated = true;
      }
    });

    if (updated) {
      alert("✅ Prescription saved successfully.");
    } else {
      alert("❌ No matching visitLog found.");
    }
  });
}

function deleteVisitorRequest(requestKey, visitorIndex) {
  const ref = db.ref("sentToDoctor/" + requestKey);

  ref.once("value").then((snapshot) => {
    let visitorArray = snapshot.val();

    if (!Array.isArray(visitorArray)) {
      return alert("❌ Unable to delete request: Invalid data.");
    }

    visitorArray.splice(visitorIndex, 1);

    if (visitorArray.length === 0) {
      ref.remove();
    } else {
      ref.set(visitorArray);
    }

    alert("✅ Request deleted.");
  }).catch((error) => {
    alert("❌ Error deleting request: " + error.message);
  });
}

function sendNextVisitorAlert() {
  db.ref("alerts/nextVisitor").set({
    message: "Doctor is ready for the next visitor",
    timestamp: new Date().toLocaleString()
  }).then(() => {
    alert("✅ Alert sent to receptionist.");
  }).catch((error) => {
    alert("❌ Failed to send alert: " + error.message);
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


loadSentVisitors();
