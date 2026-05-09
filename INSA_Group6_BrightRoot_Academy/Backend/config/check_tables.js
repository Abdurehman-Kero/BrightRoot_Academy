require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || 'brightroot_academy',
    });
    console.log('✅ DB connected');

    const [tables] = await conn.query("SHOW TABLES");
    const allTables = tables.map(r => Object.values(r)[0]);
    const aiTables = allTables.filter(t => t.startsWith('ai_'));
    console.log('All AI tables:', aiTables);

    if (aiTables.length === 0) {
      console.log('❌ NO AI TABLES FOUND - need to run: node config/migrate_tutor.js');
    } else {
      // Check ai_conversations columns
      const [cols] = await conn.query("DESCRIBE ai_conversations");
      console.log('\nai_conversations columns:', cols.map(c => c.Field));
    }

    await conn.end();
  } catch (e) {
    console.error('Error:', e.message);
  }
})();
