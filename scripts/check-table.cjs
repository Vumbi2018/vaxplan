const { Pool } = require('pg');
const p = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/vaxplan' });
Promise.all([
  p.query("SELECT COUNT(*) as total, COUNT(CASE WHEN is_active THEN 1 END) as active FROM facility_staff WHERE facility_id=21141"),
  p.query("SELECT COUNT(*) as total FROM cold_chain_equipment WHERE facility_id=21141"),
  p.query("SELECT full_name, role, nrc, training_status FROM facility_staff WHERE facility_id=21141 LIMIT 4"),
  p.query("SELECT equipment_type, brand, model, condition FROM cold_chain_equipment WHERE facility_id=21141 LIMIT 3"),
]).then(([staff, equip, staffList, equipList]) => {
  console.log("Waya Rural Health Centre - Staff:", staff.rows[0]);
  console.log("Waya Rural Health Centre - Equipment:", equip.rows[0]);
  console.log("Sample staff:", JSON.stringify(staffList.rows, null, 2));
  console.log("Sample equipment:", JSON.stringify(equipList.rows, null, 2));
  p.end();
}).catch(e => { console.error(e.message); p.end(); });
