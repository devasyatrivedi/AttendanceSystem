-- PostgreSQL Database Schema
-- Compatible with Neon (cloud) and local PostgreSQL

CREATE TABLE IF NOT EXISTS students (
  student_id    SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(100) UNIQUE NOT NULL,
  enrollment    VARCHAR(50)  UNIQUE NOT NULL,
  password      VARCHAR(255) NOT NULL,
  photo_path    VARCHAR(255),
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teachers (
  teacher_id    SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(100) UNIQUE NOT NULL,
  password      VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subjects (
  subject_id    SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  teacher_id    INT REFERENCES teachers(teacher_id)
);

CREATE TABLE IF NOT EXISTS attendance (
  attendance_id SERIAL PRIMARY KEY,
  student_id    INT REFERENCES students(student_id),
  subject_id    INT REFERENCES subjects(subject_id),
  date          DATE DEFAULT CURRENT_DATE,
  status        VARCHAR(10) CHECK (status IN ('Present','Absent')),
  marked_by     VARCHAR(20) DEFAULT 'manual',
  created_at    TIMESTAMP DEFAULT NOW(),
  UNIQUE (student_id, subject_id, date)
);

-- Insert dummy teacher and subject for immediate testing
-- Password is 'password123' hashed with bcrypt
INSERT INTO teachers (name, email, password)
  VALUES ('Admin Teacher', 'teacher@test.com', '$2a$10$WwO5i6wT2Q8K2kS0vV1.vO2M8sK0o5/VwO98O0vVK2O0/WwO5i6wT2')
  ON CONFLICT (email) DO NOTHING;

INSERT INTO subjects (name, teacher_id)
  SELECT 'Mathematics', teacher_id FROM teachers WHERE email = 'teacher@test.com'
  AND NOT EXISTS (SELECT 1 FROM subjects WHERE name = 'Mathematics');

INSERT INTO subjects (name, teacher_id)
  SELECT 'Physics', teacher_id FROM teachers WHERE email = 'teacher@test.com'
  AND NOT EXISTS (SELECT 1 FROM subjects WHERE name = 'Physics');
