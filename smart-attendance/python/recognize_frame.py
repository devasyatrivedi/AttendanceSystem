import os
import cv2
import face_recognition
import pickle
import json
import numpy as np
import base64
import sys

def recognize_frame():
    try:
        # Load encodings
        encodings_file = os.path.join(os.path.dirname(__file__), 'encodings.pkl')
        if not os.path.exists(encodings_file):
            print(json.dumps({"type": "error", "message": "Face encodings not found. Please train first."}))
            sys.stdout.flush()
            return

        with open(encodings_file, "rb") as f:
            data = pickle.load(f)

        known_encodings = data["encodings"]
        known_names = data["names"]

        # Main loop to read from stdin
        for line in sys.stdin:
            if not line.strip():
                continue
            
            try:
                # Decode base64 frame
                img_data = base64.b64decode(line.strip())
                nparr = np.frombuffer(img_data, np.uint8)
                frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

                if frame is None:
                    continue

                # Process for recognition
                small_frame = cv2.resize(frame, (0, 0), fx=0.5, fy=0.5)
                rgb_small_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)
                
                face_locations = face_recognition.face_locations(rgb_small_frame, model="hog")
                face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)
                
                recognized_now = []
                for face_encoding in face_encodings:
                    matches = face_recognition.compare_faces(known_encodings, face_encoding, tolerance=0.5)
                    if True in matches:
                        first_match_index = matches.index(True)
                        name = known_names[first_match_index]
                        recognized_now.append(name)

                # Output results
                print(json.dumps({
                    "type": "recognized", 
                    "recognized": recognized_now
                }))
                sys.stdout.flush()

            except Exception as e:
                # Silent fail for individual frame processing errors to keep loop alive
                pass

    except Exception as e:
        print(json.dumps({"type": "error", "message": f"Python Critical Error: {str(e)}"}))
        sys.stdout.flush()

if __name__ == "__main__":
    recognize_frame()
