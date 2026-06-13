import fs from 'fs';

async function logout() {
  try {
    const res = await fetch('http://localhost:3000/api/logout', {
      method: 'POST'
    });
    const data = await res.json();
    console.log("Logout response:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Logout error:", err.message);
  }
}

logout();
