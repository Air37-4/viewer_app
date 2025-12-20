import os
import shutil
from flask import Flask, render_template, jsonify, send_from_directory, request

app = Flask(__name__)

# Correct path to the folder with files
BASE_DIR = r"C:\Users\air37\Downloads\Лена"

ALLOWED_EXTENSIONS = {'.html', '.mp4', '.webm', '.ogg', '.mp3', '.wav', '.avi', '.mov', '.mkv', '.m4v'}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/files')
def list_files():
    files = []
    for f in os.listdir(BASE_DIR):
        ext = os.path.splitext(f.lower())[1]
        if ext in ALLOWED_EXTENSIONS:
            if ext == '.html':
                ftype = 'html'
            elif ext in {'.mp3', '.wav'}:
                ftype = 'audio'
            else:
                ftype = 'video'
            files.append({
                'name': f,
                'type': ftype
            })
    return jsonify(files)

@app.route('/files/<path:filename>')
def serve_file(filename):
    return send_from_directory(BASE_DIR, filename)

@app.route('/api/delete/<path:filename>', methods=['DELETE'])
def delete_file(filename):
    file_path = os.path.join(BASE_DIR, filename)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
            return jsonify({'status': 'success'})
        except Exception as e:
            return jsonify({'status': 'error', 'message': str(e)}), 500
    return jsonify({'status': 'error', 'message': 'File not found'}), 404

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'status': 'error', 'message': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'status': 'error', 'message': 'No selected file'}), 400
    
    ext = os.path.splitext(file.filename.lower())[1]
    if ext not in ALLOWED_EXTENSIONS:
        return jsonify({'status': 'error', 'message': 'Format not allowed'}), 400
        
    file_path = os.path.join(BASE_DIR, file.filename)
    file.save(file_path)
    return jsonify({'status': 'success', 'filename': file.filename})

if __name__ == '__main__':
    print("Starting Flask server...")
    print(f"Base Directory: {BASE_DIR}")
    # Using port 5001 to avoid common conflicts
    app.run(debug=True, host='0.0.0.0', port=5001)
