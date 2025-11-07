import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

async function migrateParentLinks() {
  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'schooluser',
    password: process.env.DB_PASSWORD || 'schoolpass',
    database: process.env.DB_NAME || 'schoolpro',
  });

  try {
    await dataSource.initialize();
    console.log('Connected to database');

    // Migrate existing links from parent_students to students.parentId
    const result = await dataSource.query(`
      UPDATE students s
      INNER JOIN parent_students ps ON ps.studentId = s.id
      SET s.parentId = ps.parentId
      WHERE s.parentId IS NULL
    `);

    console.log(`Migration complete: ${result.affectedRows || 0} students updated with parentId`);
    
    // Verify
    const count = await dataSource.query(`
      SELECT COUNT(*) as total FROM students WHERE parentId IS NOT NULL
    `);
    console.log(`Total students with parent: ${count[0]?.total || 0}`);

    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateParentLinks();
