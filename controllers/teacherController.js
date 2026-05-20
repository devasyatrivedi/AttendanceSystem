const { pool } = require('../database/db');
const nodemailer = require('nodemailer');

const getStudents = async (req, res) => {
  try {
    const query = 'SELECT student_id, name, email, enrollment, photo_path, created_at FROM students';
    const result = await pool.query(query);

    res.json({ success: true, data: result.rows, message: 'Students fetched' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const getSubjects = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const query = 'SELECT * FROM subjects WHERE teacher_id = $1';
    const result = await pool.query(query, [teacherId]);

    res.json({ success: true, data: result.rows, message: 'Subjects fetched' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const sendEmail = async (req, res) => {
  const { subject_id, date } = req.body;
  try {
    if (!subject_id || !date) {
      return res.status(400).json({ success: false, message: 'subject_id and date are required' });
    }

    // Identify absent students
    const query = `
      SELECT s.name as student_name, s.email, sub.name as subject_name, a.status 
      FROM attendance a
      JOIN students s ON a.student_id = s.student_id
      JOIN subjects sub ON a.subject_id = sub.subject_id
      WHERE a.subject_id = $1 AND a.date = $2 AND a.status = 'Absent'
    `;
    const result = await pool.query(query, [subject_id, date]);

    if (result.rows.length === 0) {
      return res.json({ success: true, message: 'No absent students found for this date/subject' });
    }

    // Configure nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    let sentCount = 0;
    for (let record of result.rows) {
      // Calculate attendance required
      const statsQuery = `
        SELECT 
          COUNT(attendance_id) as total_lectures,
          SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as attended_lectures
        FROM attendance 
        WHERE student_id = (SELECT student_id FROM students WHERE email = $1)
        AND subject_id = $2
      `;
      const stats = await pool.query(statsQuery, [record.email, subject_id]);
      const total = parseInt(stats.rows[0].total_lectures || 0);
      const attended = parseInt(stats.rows[0].attended_lectures || 0);
      const percentage = total === 0 ? 0 : ((attended / total) * 100);
      let needed = 0;
      if (percentage < 75) {
        needed = Math.ceil((0.75 * total - attended) / 0.25);
        if(needed < 0) needed = 0;
      }

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: record.email,
        subject: `⚠️ Attendance Warning – ${record.subject_name}`,
        text: `Dear ${record.student_name},\n\nYou were marked ABSENT in ${record.subject_name} on ${date}.\nYour current attendance: ${percentage.toFixed(2)}%\nRequired attendance: 75%\nYou need ${needed} more lectures to reach 75%.\n\nPlease ensure regular attendance.\n`
      };

      await transporter.sendMail(mailOptions);
      sentCount++;
    }

    res.json({ success: true, message: `Emails sent to ${sentCount} absent students successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error sending email', error: error.message });
  }
};

const getDailyAttendance = async (req, res) => {
  const { subject_id, date } = req.query;
  try {
    if (!subject_id || !date) {
      return res.status(400).json({ success: false, message: 'subject_id and date are required' });
    }

    const query = `
      SELECT s.name as student_name, s.email, s.enrollment, sub.name as subject_name, a.status 
      FROM attendance a
      JOIN students s ON a.student_id = s.student_id
      JOIN subjects sub ON a.subject_id = sub.subject_id
      WHERE a.subject_id = $1 AND a.date = $2 AND a.status = 'Absent'
    `;
    const result = await pool.query(query, [subject_id, date]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const getDashboardStats = async (req, res) => {
  const { date } = req.query;
  try {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const teacherId = req.user.id;
    
    // Total Students
    const totalResult = await pool.query('SELECT COUNT(*) FROM students');
    
    // Overall Stats for the date
    const overallPresent = await pool.query(`
      SELECT COUNT(*) FROM attendance a
      JOIN subjects s ON a.subject_id = s.subject_id
      WHERE a.date = $1 AND a.status = 'Present' AND s.teacher_id = $2
    `, [targetDate, teacherId]);
    
    const overallAbsent = await pool.query(`
      SELECT COUNT(*) FROM attendance a
      JOIN subjects s ON a.subject_id = s.subject_id
      WHERE a.date = $1 AND a.status = 'Absent' AND s.teacher_id = $2
    `, [targetDate, teacherId]);

    // Subject-wise Breakdown
    const subjectStatsQuery = `
      SELECT 
        s.subject_id, 
        s.name as subject_name,
        COUNT(CASE WHEN a.status = 'Present' THEN 1 END) as present_count,
        COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) as absent_count
      FROM subjects s
      LEFT JOIN attendance a ON s.subject_id = a.subject_id AND a.date = $1
      WHERE s.teacher_id = $2
      GROUP BY s.subject_id, s.name
      ORDER BY s.name ASC
    `;
    const subjectStatsResult = await pool.query(subjectStatsQuery, [targetDate, teacherId]);
    
    res.json({
      success: true,
      data: {
        totalStudents: parseInt(totalResult.rows[0].count),
        todayPresent: parseInt(overallPresent.rows[0].count),
        todayAbsent: parseInt(overallAbsent.rows[0].count),
        subjectBreakdown: subjectStatsResult.rows.map(r => ({
          id: r.subject_id,
          name: r.subject_name,
          present: parseInt(r.present_count),
          absent: parseInt(r.absent_count)
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Stats fetch failed', error: error.message });
  }
};

const getAttendanceReport = async (req, res) => {
  const { subject_id, date } = req.query;
  try {
    if (!subject_id || !date) {
      return res.status(400).json({ success: false, message: 'subject_id and date are required' });
    }

    const query = `
      SELECT s.enrollment, s.name, a.status, a.marked_by, a.created_at
      FROM attendance a
      JOIN students s ON a.student_id = s.student_id
      WHERE a.subject_id = $1 AND a.date = $2
      ORDER BY s.enrollment ASC
    `;
    const result = await pool.query(query, [subject_id, date]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Report fetch failed', error: error.message });
  }
};

const updateStudent = async (req, res) => {
  const { id } = req.params;
  const { name, email, enrollment } = req.body;
  try {
    if (!name || !email || !enrollment) {
      return res.status(400).json({ success: false, message: 'Name, email, and enrollment are required' });
    }

    const query = 'UPDATE students SET name = $1, email = $2, enrollment = $3 WHERE student_id = $4 RETURNING *';
    const result = await pool.query(query, [name, email, enrollment, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.json({ success: true, data: result.rows[0], message: 'Student updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const getMonthlyStats = async (req, res) => {
  const { month, year } = req.query;
  try {
    const teacherId = req.user.id;
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const query = `
      SELECT 
        a.date,
        COUNT(CASE WHEN a.status = 'Present' THEN 1 END) as present_count,
        COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) as absent_count
      FROM attendance a
      JOIN subjects s ON a.subject_id = s.subject_id
      WHERE s.teacher_id = $1 AND a.date >= $2 AND a.date <= $3
      GROUP BY a.date
      ORDER BY a.date ASC
    `;
    const result = await pool.query(query, [teacherId, startDate, endDate]);

    res.json({ success: true, data: result.rows, message: 'Monthly stats fetched' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = { getStudents, getSubjects, sendEmail, getDailyAttendance, getDashboardStats, getAttendanceReport, updateStudent, getMonthlyStats };
