import os
import face_recognition
import pickle
import json
import traceback

def train_faces():
    try:
        dataset_dir = os.path.join(os.path.dirname(__file__), 'dataset')
        encodings_file = os.path.join(os.path.dirname(__file__), 'encodings.pkl')
        
        if not os.path.exists(dataset_dir):
            os.makedirs(dataset_dir)
            
        known_encodings = []
        known_names = []
        
        count = 0
        for filename in os.listdir(dataset_dir):
            if filename.endswith(".jpg") or filename.endswith(".jpeg") or filename.endswith(".png"):
                filepath = os.path.join(dataset_dir, filename)
                # Enrollment number from filename
                name = os.path.splitext(filename)[0]
                
                image = face_recognition.load_image_file(filepath)
                encodings = face_recognition.face_encodings(image)
                
                if len(encodings) > 0:
                    known_encodings.append(encodings[0])
                    known_names.append(name)
                    count += 1
                    
        data = {"encodings": known_encodings, "names": known_names}
        
        with open(encodings_file, "wb") as f:
            pickle.dump(data, f)
            
        print(json.dumps({"success": True, "message": f"{count} faces trained"}))
    except Exception as e:
        print(json.dumps({"success": False, "message": str(e), "traceback": traceback.format_exc()}))

if __name__ == "__main__":
    train_faces()
