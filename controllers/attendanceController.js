const { spawn } = require('child_process');
const { pool } = require('../database/db');
const path = require('path');

let activePythonProcess = null;

const stopFaceRecognition = (req, res) => {
  if (activePythonProcess) {
    activePythonProcess.kill();
    activePythonProcess = null;
    return res.json({ success: true, message: 'Recognition stopped' });
  }
  res.json({ success: false, message: 'No active recognition process' });
};

const triggerFaceRecognition = async (req, res) => {
  const { subject_id, date } = req.body;
  if (!subject_id || !date) {
    return res.status(400).json({ success: false, message: 'Subject ID and Date are required to start recognition' });
  }

  try {
    const spawnProcess = () => {
      console.log(`Spawning persistent python process: ${process.env.PYTHON_PATH}`);
      activePythonProcess = spawn(process.env.PYTHON_PATH, [path.join(__dirname, '../python/recognize_face.py')]);
      
      activePythonProcess.on('error', (err) => {
        console.error("Failed to start python process:", err);
        if (global.io) global.io.emit('attendance-error', { message: "System failed to initialize vision module." });
      });

      let buffer = '';
      const sessionRecognized = new Set(); 

      activePythonProcess.stdout.on('data', (data) => {
        buffer += data.toString();
        let lines = buffer.split('\n');
        buffer = lines.pop(); 

        lines.forEach(async line => {
          if (line.trim()) {
            try {
              const parsed = JSON.parse(line);
              
              if (parsed.type === 'feed' && parsed.recognized && parsed.recognized.length > 0) {
                for (let enrollment of parsed.recognized) {
                  const enrollStr = enrollment.toString();
                  if (!sessionRecognized.has(enrollStr)) {
                    sessionRecognized.add(enrollStr);
                    
                    (async () => {
                      try {
                        const enrollTrim = enrollStr.trim();
                        console.log(`[TRACE] Searching DB for enrollment: "${enrollTrim}"`);
                        const studentRes = await pool.query('SELECT student_id, name FROM students WHERE enrollment = $1', [enrollTrim]);
                        
                        if (studentRes.rows.length > 0) {
                          const { student_id: sid, name: sname } = studentRes.rows[0];
                          console.log(`[TRACE] Student found: ${sname}. Inserting attendance...`);
                          
                          await pool.query(
                            `INSERT INTO attendance (student_id, subject_id, date, status, marked_by) 
                             VALUES ($1, $2, $3, 'Present', 'auto-face')
                             ON CONFLICT (student_id, subject_id, date) 
                             DO UPDATE SET status = 'Present', marked_by = 'auto-face'`,
                          [sid, subject_id, date]
                          );
                          
                          console.log(`[TRACE] Database update successful for ${sname}`);
                          
                          if (global.io) {
                            console.log(`[TRACE] Emitting attendance-marked event for: ${sname}`);
                            global.io.emit('attendance-marked', { name: sname, enrollment: enrollTrim });
                          } else {
                            console.error("[TRACE] ERROR: global.io is undefined!");
                          }
                        } else {
                          console.warn(`[TRACE] WARNING: Enrollment "${enrollTrim}" not found in database.`);
                          // Let's emit an "unknown" event for debugging
                          if (global.io) global.io.emit('diagnostic-backend', { msg: `Found enrollment "${enrollTrim}" in vision, but not in Database.` });
                        }
                      } catch (dbErr) {
                        console.error("DB Auto-Save Error:", dbErr);
                      }
                    })();
                  }
                }
              }

              if (global.io) {
                // Throttled logging of feed data
                if (parsed.recognized && parsed.recognized.length > 0) {
                   console.log(`[DIAGNOSTIC] Python Detected: ${parsed.recognized.join(', ')}`);
                }
                global.io.volatile.emit('attendance-data', parsed);
              }
            } catch (e) {
              // Not a valid JSON
            }
          }
        });
      });

      activePythonProcess.stderr.on('data', (data) => {
        console.error(`Python Runtime Error: ${data}`);
        if (global.io) global.io.emit('attendance-error', { message: data.toString() });
      });

      activePythonProcess.on('close', (code) => {
        console.log(`Python process closed with code ${code}`);
        activePythonProcess = null;
        if (global.io) global.io.emit('attendance-stopped', { code });
      });

      res.json({ success: true, message: 'Recognition started' });
    };

    if (activePythonProcess) {
       activePythonProcess.kill();
       // Give Windows a moment to release the camera handle
       setTimeout(spawnProcess, 500);
    } else {
       spawnProcess();
    }

  } catch (error) {
    console.error('Controller Crash:', error);
    res.status(500).json({ success: false, message: 'Internal system error', error: error.message });
  }
};

const getActiveProcess = () => activePythonProcess;

const saveManualAttendance = async (req, res) => {
  const { subject_id, date, attendance_array } = req.body;
  
  if (!subject_id || !date || !attendance_array || !Array.isArray(attendance_array)) {
    return res.status(400).json({ success: false, message: 'Invalid payload' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    for (let record of attendance_array) {
      // Find student
      const studentResult = await client.query('SELECT student_id FROM students WHERE enrollment = $1', [record.enrollment]);
      if (studentResult.rows.length === 0) continue; // Skip invalid enrollment
      
      const student_id = studentResult.rows[0].student_id;
      
      // Check if attendance already exists for this subject, date and student
      const checkResult = await client.query(
        'SELECT attendance_id FROM attendance WHERE student_id = $1 AND subject_id = $2 AND date = $3',
        [student_id, subject_id, date]
      );
      
      if (checkResult.rows.length > 0) {
        // Update
        await client.query(
          `UPDATE attendance SET status = $1, marked_by = 'manual' WHERE attendance_id = $2`,
          [record.status, checkResult.rows[0].attendance_id]
        );
      } else {
        // Insert
        await client.query(
          `INSERT INTO attendance (student_id, subject_id, date, status, marked_by) VALUES ($1, $2, $3, $4, 'manual')`,
          [student_id, subject_id, date, record.status]
        );
      }
    }
    
    await client.query('COMMIT');
    res.json({ success: true, message: 'Attendance saved successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: 'Database error', error: error.message });
  } finally {
    client.release();
  }
};

// Exposed for the node -e script in README
const trainFaces = () => {
  const pythonProcess = spawn(process.env.PYTHON_PATH, [path.join(__dirname, '../python/train_faces.py')]);
  pythonProcess.stdout.on('data', (data) => console.log(`${data}`));
  pythonProcess.stderr.on('data', (data) => console.error(`${data}`));
  pythonProcess.on('close', (code) => {
    console.log(`Training completed with code ${code}`);
    process.exit(code);
  });
};

const getAttendanceByDate = async (req, res) => {
  const { subject_id, date } = req.query;
  
  if (!subject_id || !date) {
    return res.status(400).json({ success: false, message: 'Subject ID and Date are required' });
  }

  try {
    const result = await pool.query(
      `SELECT s.enrollment, a.status 
       FROM attendance a
       JOIN students s ON a.student_id = s.student_id
       WHERE a.subject_id = $1 AND a.date = $2`,
      [subject_id, date]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Fetch Attendance Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch attendance records', error: error.message });
  }
};

module.exports = { triggerFaceRecognition, stopFaceRecognition, saveManualAttendance, getAttendanceByDate, trainFaces, getActiveProcess };
