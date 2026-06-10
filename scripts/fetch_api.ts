import { db } from "../server/db";
import { sessions } from "@shared/schema";
import crypto from "crypto";

// Sign session ID function
function sign(val: string, secret: string) {
  const mac = crypto.createHmac('sha256', secret).update(val).digest('base64').replace(/=+$/, '');
  return 's:' + val + '.' + mac;
}

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
    const secret = "temporary_dev_session_secret_for_gis_microplanning";
    const signedSid = sign(sid, secret);
    console.log(`Signed connect.sid: ${signedSid}`);

    const cookie = `connect.sid=${encodeURIComponent(signedSid)}`;
    console.log(`Fetching with Cookie: ${cookie}`);

    const testUrl = async (url: string) => {
      const res = await fetch(url, {
        headers: { Cookie: cookie }
      });
      console.log(`GET ${url} Status: ${res.status}`);
      if (res.status === 200) {
        const json = await res.json();
        console.log(`  Length: ${json.length}`);
        if (json.length > 0) {
          console.log(`  Sample:`, JSON.stringify(json[0]).substring(0, 300));
        }
      } else {
        console.log(`  Response: ${await res.text()}`);
      }
    };

    await testUrl("http://localhost:5000/api/provinces");
    await testUrl("http://localhost:5000/api/districts");
    await testUrl("http://localhost:5000/api/facilities");
    await testUrl("http://localhost:5000/api/villages");

  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

run();
