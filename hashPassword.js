import bcrypt from 'bcrypt';

const plainPassword = 'YourNewPassword123'; // Apna naya password

const hashPassword = async () => {
  try {
    const hash = await bcrypt.hash(plainPassword, 10);
    console.log('🔐 Hashed password:', hash);
  } catch (err) {
    console.error('❌ Error:', err);
  }
};

hashPassword();
