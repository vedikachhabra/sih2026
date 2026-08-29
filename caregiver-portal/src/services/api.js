const API_BASE = "http://localhost:8000/api/v1";

export async function fetchPatients() {
  const res = await fetch(`${API_BASE}/patients`);
  if (!res.ok) throw new Error("Failed to fetch patients");
  return res.json();
}

export async function fetchPatient(patientId) {
  const res = await fetch(`${API_BASE}/patients/${patientId}`);
  if (!res.ok) throw new Error("Failed to fetch patient details");
  return res.json();
}

export async function fetchCognitiveTrends(patientId, days = 30) {
  const res = await fetch(`${API_BASE}/analytics/${patientId}/trends?range_days=${days}`);
  if (!res.ok) throw new Error("Failed to fetch cognitive trends");
  return res.json();
}

export async function fetchCognitiveProfile(patientId) {
  const res = await fetch(`${API_BASE}/analytics/${patientId}/cognitive-profile`);
  if (!res.ok) throw new Error("Failed to fetch cognitive profile");
  return res.json();
}

export async function fetchAlerts(severity = null, unacknowledgedOnly = false) {
  let url = `${API_BASE}/alerts`;
  const params = new URLSearchParams();
  if (severity) params.append("severity", severity);
  if (unacknowledgedOnly) params.append("unacknowledged_only", "true");
  if (params.toString()) url += `?${params.toString()}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch alerts");
  return res.json();
}

export async function acknowledgeAlert(alertId, acknowledgedBy, actionTaken) {
  const res = await fetch(`${API_BASE}/alerts/${alertId}/acknowledge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      acknowledged_by: acknowledgedBy,
      action_taken: actionTaken
    })
  });
  if (!res.ok) throw new Error("Failed to acknowledge alert");
  return res.json();
}

export async function fetchPatientReminders(patientId) {
  const res = await fetch(`${API_BASE}/patients/${patientId}/reminders`);
  if (!res.ok) throw new Error("Failed to fetch reminders");
  return res.json();
}

export async function addPatientReminder(patientId, reminderData) {
  const res = await fetch(`${API_BASE}/patients/${patientId}/reminders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(reminderData)
  });
  if (!res.ok) throw new Error("Failed to add reminder");
  return res.json();
}

export async function deletePatientReminder(patientId, reminderId) {
  const res = await fetch(`${API_BASE}/patients/${patientId}/reminders/${reminderId}`, {
    method: "DELETE"
  });
  if (!res.ok) throw new Error("Failed to delete reminder");
  return res.json();
}

export async function registerPatient(patientData) {
  const res = await fetch(`${API_BASE}/patients/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patientData)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to register patient");
  }
  return res.json();
}


export function getExportReportUrl(patientId, days = 30) {
  return `${API_BASE}/reports/${patientId}/export?range_days=${days}`;
}
