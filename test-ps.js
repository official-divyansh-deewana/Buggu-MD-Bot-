import { execSync } from 'child_process';

try {
  const output = execSync('ps aux || ps').toString();
  console.log("=== Active Running Processes ===");
  console.log(output);
} catch (err) {
  console.error("Failed to list processes:", err.message);
}
