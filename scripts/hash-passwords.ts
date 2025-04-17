import { getConnection } from '@/utils/db';

async function hashPasswords() {
  try {
    const connection = await getConnection();

    // Fetch all users
    const [users] = await connection.query('SELECT id, password FROM Users');
    for (const user of users) {
      const { id, password } = user;

      // Skip passwords that already meet some condition (if needed)
      if (password.startsWith('some-condition')) { // Replace 'some-condition' as needed
        console.log(`Password for user ID ${id} is already valid.`);
        continue;
      }

      // Perform plain text comparison or other logic
      console.log(`Password for user ID ${id} is: ${password}`);
    }

    console.log('All passwords have been processed successfully.');
    connection.end();
  } catch (error) {
    console.error('Error processing passwords:', error);
  }
}

hashPasswords();
