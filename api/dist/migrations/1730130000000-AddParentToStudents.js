"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddParentToStudents1730130000000 = void 0;
class AddParentToStudents1730130000000 {
    name = 'AddParentToStudents1730130000000';
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE students
      ADD COLUMN parentId CHAR(36) NULL
    `);
        await queryRunner.query(`
      ALTER TABLE students
      ADD CONSTRAINT fk_students_parent
      FOREIGN KEY (parentId) REFERENCES users(id)
      ON DELETE SET NULL
      ON UPDATE CASCADE
    `);
        await queryRunner.query(`
      CREATE INDEX idx_students_parentId ON students(parentId)
    `);
        await queryRunner.query(`
      UPDATE students s
      INNER JOIN parent_students ps ON ps.studentId = s.id
      SET s.parentId = ps.parentId
    `);
        console.log('Migration: Added parentId to students and migrated existing links');
    }
    async down(queryRunner) {
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
        await queryRunner.query(`ALTER TABLE students DROP FOREIGN KEY fk_students_parent`);
        await queryRunner.query(`DROP INDEX idx_students_parentId ON students`);
        await queryRunner.query(`ALTER TABLE students DROP COLUMN parentId`);
        console.log('Migration: Rolled back parentId from students');
    }
}
exports.AddParentToStudents1730130000000 = AddParentToStudents1730130000000;
//# sourceMappingURL=1730130000000-AddParentToStudents.js.map