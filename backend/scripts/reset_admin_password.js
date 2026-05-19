const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');

async function resetAdminPassword() {
  try {
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync("admin123", salt);
    
    console.log("Hashes:", hashedPassword);

    const result = await pool.query(
      'UPDATE users SET password = $1 WHERE email = $2 RETURNING id, email', 
      [hashedPassword, 'admin@test.com']
    );
    
    if (result.rows.length > 0) {
      console.log('✅ Admin password updated successfully for:', result.rows[0].email);
    } else {
      console.log('❌ Admin user not found to update.');
    }
  } catch (error) {
    console.error('Error updating admin password:', error);
  } finally {
    process.exit();
  }
}

resetAdminPassword();
