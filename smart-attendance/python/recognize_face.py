import os
import cv2
import face_recognition
import pickle
import json
import time
import traceback
import base64
import sys
from threading import Thread

# Threaded class to read frames from camera without blocking
class VideoStream:
    def __init__(self, src=0):
        self.stream = cv2.VideoCapture(src)
        # Set resolution to 640x480 for optimal performance/latency balance
        self.stream.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        self.stream.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        (self.grabbed, self.frame) = self.stream.read()
        self.stopped = False

    def start(self):
        Thread(target=self.update, args=()).start()
        return self

    def update(self):
        while not self.stopped:
            (self.grabbed, self.frame) = self.stream.read()
            # Prevent thread from spinning too fast
            time.sleep(0.01)

    def read(self):
        return self.frame

    def stop(self):
        self.stopped = True
        self.stream.release()

# Global state for background recognition
recognized_now = []
latest_frame = None

def recognition_worker(known_encodings, known_names):
    global recognized_now, latest_frame
    while True:
        if latest_frame is not None:
            # Optimize for recognition: 640px max width maintains accuracy while saving CPU
            h, w = latest_frame.shape[:2]
            scale = 640 / max(h, w)
            if scale < 1.0:
                small_frame = cv2.resize(latest_frame, (0,0), fx=scale, fy=scale, interpolation=cv2.INTER_LINEAR)
            else:
                small_frame = latest_frame
                
            rgb_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)
            
            # Use HOG for speed
            face_locations = face_recognition.face_locations(rgb_frame, model="hog")
            face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)
            
            if len(face_encodings) > 0:
                sys.stderr.write(f"DEBUG: Biometric Core detected {len(face_encodings)} face(s).\n")
                sys.stderr.flush()
            
            temp_recognized = []
            for face_encoding in face_encodings:
                # Maximum default tolerance (0.6) for highest sensitivity
                face_distances = face_recognition.face_distance(known_encodings, face_encoding)
                best_match_index = -1
                min_distance = 0.6 # Library default sensitivity

                for i, distance in enumerate(face_distances):
                    if distance < min_distance:
                        min_distance = distance
                        best_match_index = i
                
                if best_match_index != -1:
                    name = known_names[best_match_index]
                    temp_recognized.append(name)
            
            recognized_now = temp_recognized
        
        # Recognition frequency control (don't burn CPU)
        time.sleep(0.5)

def recognize_faces():
    global latest_frame
    try:
        encodings_file = os.path.join(os.path.dirname(__file__), 'encodings.pkl')
        if not os.path.exists(encodings_file):
            print(json.dumps({"type": "error", "message": "Face encodings not found. Please train first."}))
            sys.stdout.flush()
            return

        with open(encodings_file, "rb") as f:
            data = pickle.load(f)

        known_encodings = data["encodings"]
        known_names = data["names"]
        
        # Start recognition thread
        rec_thread = Thread(target=recognition_worker, args=(known_encodings, known_names))
        rec_thread.daemon = True
        rec_thread.start()
        
        # Initialize threaded stream
        vs = VideoStream(src=0).start()
        time.sleep(1.0) # Warm up
        
        # Throttling parameters (Aim for high fluidity)
        target_fps = 20 
        frame_interval = 1.0 / target_fps
        last_frame_time = 0

        while True:
            frame = vs.read()
            if frame is None:
                continue
            
            latest_frame = frame # Update global latest for recognition thread
            current_time = time.time()
            
            # Emission Throttling for the web feed
            if (current_time - last_frame_time) >= frame_interval:
                # Resize specifically for web feed (320px width is perfect for Socket.io)
                feed_width = 320
                h, w = frame.shape[:2]
                feed_height = int(h * (feed_width / w))
                feed_frame = cv2.resize(frame, (feed_width, feed_height), interpolation=cv2.INTER_AREA)
                
                # Encode with optimized quality for maximum speed
                # Quality 40 is perfect for real-time monitoring
                encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 40]
                _, buffer = cv2.imencode('.jpg', feed_frame, encode_param)
                jpg_as_text = base64.b64encode(buffer).decode('utf-8')
                
                # Dispatch to Node.js
                print(json.dumps({
                    "type": "feed", 
                    "frame": jpg_as_text, 
                    "recognized": recognized_now
                }))
                sys.stdout.flush()
                last_frame_time = current_time

            # Prevent loop from spinning too fast
            time.sleep(0.01)

    except Exception as e:
        print(json.dumps({"type": "error", "message": f"Python Error: {str(e)}", "traceback": traceback.format_exc()}))
        sys.stdout.flush()

if __name__ == "__main__":
    recognize_faces()
