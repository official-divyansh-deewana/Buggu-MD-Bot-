import fs from 'fs';

async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/status');
    const data = await res.json();
    fs.writeFileSync('api_response.json', JSON.stringify(data, null, 2));
    console.log("Success");
  } catch (err) {
    console.error("Error calling API:", err.message);
  }
}

test();
