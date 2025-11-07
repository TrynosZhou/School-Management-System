import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddParentToStudents1730130000000 implements MigrationInterface {
  name = 'AddParentToStudents1730130000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add parentId column to students table
    await queryRunner.query(`
      ALTER TABLE students
      ADD COLUMN parentId CHAR(36) NULL
    `);

    // Create FK constraint to users table
    await queryRunner.query(`
      ALTER TABLE students
      ADD CONSTRAINT fk_students_parent
      FOREIGN KEY (parentId) REFERENCES users(id)
      ON DELETE SET NULL
      ON UPDATE CASCADE
    `);

    // Create index for performance
    await queryRunner.query(`
      CREATE INDEX idx_students_parentId ON students(parentId)
    `);

    // Migrate existing links from parent_students junction table
    await queryRunner.query(`
      UPDATE students s
      INNER JOIN parent_students ps ON ps.studentId = s.id
      SET s.parentId = ps.parentId
    `);

    console.log('Migration: Added parentId to students and migrated existing links');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore links to parent_students if rolling back
    await queryRunner.query(`
      INSERT INTO parent_students (id, parentId, studentId, createdAt)
      SELECT UUID(), s.parentId, s.id, NOW()
      FROM students s
      WHERE s.parentId IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM parent_students ps 
        WHERE ps.parentId = s.parentId AND ps.studentId = s.id
      )
    `);

    // Drop FK and column
    await queryRunner.query(`ALTER TABLE students DROP FOREIGN KEY fk_students_parent`);
    await queryRunner.query(`DROP INDEX idx_students_parentId ON students`);
    await queryRunner.query(`ALTER TABLE students DROP COLUMN parentId`);

    console.log('Migration: Rolled back parentId from students');
  }
}
