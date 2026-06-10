import { db } from "../server/db";
import { sessions } from "@shared/schema";
import { eq } from "drizzle-orm";

async function run() {
  try {
    const all = await db.select().from(sessions);
    const active = all.find(s => {
      const p = (s.sess as any)?.passport?.user;
      return p?.email === "lawrencemukombo2@gmail.com" || p === "user-lawrence-1779624510770";
    });

    if (!active) {
      console.log("No active session for Lawrence found.");
      process.exit(0);
    }

    const sid = active.sid;
    console.log(`Found session ID: ${sid}`);

    // Fetch /api/provinces using HTTP request
    const url = "http://localhost:5000/api/provinces";
    const cookie = `connect.sid=${encodeURIComponent(sid)}`; // Let's check session cookie name
    
    // We can try connect.sid or look at session settings. Let's send both or standard connect.sid
    console.log(`Fetching with cookie: ${cookie}`);
    
    const response = await fetch(url, {
      headers: {
        Cookie: `connect.sid=s%3A${sid}` // connect.sid uses s:sessionID signature usually, but since session ID in database is the unsigned key, let's see.
      }
    });

    console.log(`Status: ${response.status}`);
    const text = await response.text();
    console.log(`Response length: ${text.length}`);
    console.log(`Response preview: ${text.substring(0, 500)}`);
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

run();
