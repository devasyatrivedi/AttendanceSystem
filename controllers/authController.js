const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../database/db');
const multer = require('multer');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configure Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Save to python/dataset for face_recognition to process
    const dest = path.join(__dirname, '../python/dataset');
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    // Ext
    const ext = path.extname(file.originalname);
    // Filename should be enrollment number
    const filename = req.body.enrollment + ext;
    cb(null, filename);
  }
});

const uploadMulter = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '24h' });
};

const registerStudent = async (req, res) => {
  const { name, email, enrollment, password } = req.body;
  try {
    if (!name || !email || !enrollment || !password) {
      return res.status(400).json({ success: false, message: 'Missing fields' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Photo is required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const photoPath = `/python/dataset/${req.file.filename}`;

    const query = `
      INSERT INTO students (name, email, enrollment, password, photo_path)
      VALUES ($1, $2, $3, $4, $5) RETURNING student_id
    `;
    const values = [name, email, enrollment, hashedPassword, photoPath];
    await pool.query(query, values);

    // Call python/train_faces.py via child_process
    const pythonProcess = spawn(process.env.PYTHON_PATH, [path.join(__dirname, '../python/train_faces.py')]);
    
    pythonProcess.stdout.on('data', (data) => console.log(`Python STDOUT: ${data}`));
    pythonProcess.stderr.on('data', (data) => console.error(`Python STDERR: ${data}`));
    
    pythonProcess.on('close', (code) => {
      console.log(`train_faces.py exited with code ${code}`);
    });

    res.status(201).json({ success: true, message: 'Student registered and face training started' });
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ success: false, message: 'Email or Enrollment already exists', error: error.message });
    }
    res.status(500).json({ success: false, message: 'Server Error during registration', error: error.message });
  }
};

const loginStudent = async (req, res) => {
  const { enrollment, password } = req.body;
  try {
    const query = 'SELECT * FROM students WHERE enrollment = $1';
    const result = await pool.query(query, [enrollment]);

    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    const student = result.rows[0];
    const isMatch = await bcrypt.compare(password, student.password);

    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateToken(student.student_id, 'student');
    res.json({ success: true, message: 'Login successful', data: { token, student_id: student.student_id, name: student.name } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error during login', error: error.message });
  }
};

const loginTeacher = async (req, res) => {
  const { email, password } = req.body;
  try {
    const query = 'SELECT * FROM teachers WHERE email = $1';
    const result = await pool.query(query, [email]);

    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    const teacher = result.rows[0];
    const isMatch = await bcrypt.compare(password, teacher.password);

    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateToken(teacher.teacher_id, 'teacher');
    res.json({ success: true, message: 'Login successful', data: { token, teacher_id: teacher.teacher_id, name: teacher.name } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error during login', error: error.message });
  }
};

module.exports = { registerStudent, loginStudent, loginTeacher, uploadMulter };
