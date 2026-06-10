import { spawn } from 'child_process';

console.log('Spawning drizzle-kit push with auto-responder...');
const child = spawn('npx', ['drizzle-kit', 'push'], {
  shell: true,
  stdio: ['pipe', 'pipe', 'inherit']
});

child.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write(output);
  
  // Generic handler for drizzle-kit push interactive prompts.
  // When drizzle-kit push asks "Is X table created or renamed from Y?" or "Is X column created or renamed?"
  // it ends with a question mark "?" or shows the select options.
  if (output.includes('?') || output.includes('Is ') && output.includes(' created or renamed')) {
    console.log('\n[AUTO-RESPONDER] Detected prompt. Sending Enter...');
    child.stdin.write('\r\n');
  }
});

child.on('close', (code) => {
  console.log(`drizzle-kit push exited with code ${code}`);
  process.exit(code);
});
