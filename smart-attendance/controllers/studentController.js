const { pool } = require('../database/db');

// GET /api/student/dashboard
const getDashboard = async (req, res) => {
  try {
    const studentId = req.user.id;
    const query = 'SELECT name, email, enrollment, photo_path FROM students WHERE student_id = $1';
    const result = await pool.query(query, [studentId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.json({ success: true, data: result.rows[0], message: 'Dashboard loaded' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// GET /api/student/attendance -> subject-wise attendance
const getAttendance = async (req, res) => {
  try {
    const studentId = req.user.id;

    const query = `
      SELECT 
        s.subject_id,
        s.name as subject_name,
        COUNT(a.attendance_id) as total_lectures,
        SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) as attended_lectures
      FROM subjects s
      LEFT JOIN attendance a ON s.subject_id = a.subject_id AND a.student_id = $1
      GROUP BY s.subject_id, s.name
    `;
    const result = await pool.query(query, [studentId]);

    const formatted = result.rows.map(row => {
      const total = parseInt(row.total_lectures || 0);
      const attended = parseInt(row.attended_lectures || 0);
      const percentage = total === 0 ? 0 : ((attended / total) * 100).toFixed(2);
      
      return {
        subject_id: row.subject_id,
        subject_name: row.subject_name,
        total,
        attended,
        percentage: parseFloat(percentage)
      };
    });

    res.json({ success: true, data: formatted, message: 'Attendance fetched' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// GET /api/student/required -> lectures needed for 75%
const getRequired = async (req, res) => {
  try {
    const studentId = req.user.id;

    const query = `
      SELECT 
        s.subject_id,
        s.name as subject_name,
        COUNT(a.attendance_id) as total_lectures,
        SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) as attended_lectures
      FROM subjects s
      LEFT JOIN attendance a ON s.subject_id = a.subject_id AND a.student_id = $1
      GROUP BY s.subject_id, s.name
    `;
    const result = await pool.query(query, [studentId]);

    const requiredData = result.rows.map(row => {
      const total = parseInt(row.total_lectures || 0);
      const attended = parseInt(row.attended_lectures || 0);
      const percentage = total === 0 ? 0 : (attended / total) * 100;

      let needed = 0;
      let statusMsg = "You are above 75% ✅";

      if (percentage < 75) {
        needed = Math.ceil((0.75 * total - attended) / 0.25);
        if(needed < 0) needed = 0;
        statusMsg = `Attend ${needed} more lectures to reach 75%`;
      } else if (total === 0) {
        statusMsg = "No classes held yet.";
      }

      return {
        subject_id: row.subject_id,
        subject_name: row.subject_name,
        totalClasses: Number(total),
        attendedClasses: Number(attended),
        total: Number(total),
        attended: Number(attended),
        total_lectures: Number(total),
        attended_lectures: Number(attended),
        count: Number(total),
        percentage: parseFloat(percentage.toFixed(2)),
        needed: Number(needed),
        statusMsg
      };
    });

    res.json({ success: true, data: requiredData, message: 'Required lectures fetched' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const getAttendanceCalendar = async (req, res) => {
  try {
    const studentId = req.user.id;
    const query = `
      SELECT a.date, a.status, s.name as subject_name
      FROM attendance a
      JOIN subjects s ON a.subject_id = s.subject_id
      WHERE a.student_id = $1
      ORDER BY a.date DESC
    `;
    const result = await pool.query(query, [studentId]);

    res.json({ success: true, data: result.rows, message: 'Calendar data fetched' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = { getDashboard, getAttendance, getRequired, getAttendanceCalendar };
