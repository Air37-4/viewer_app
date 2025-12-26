import os
import shutil
from flask import Flask, render_template, jsonify, send_from_directory, request

app = Flask(__name__)

CONFIG_FILE = "viewer_config_v2.txt"

def get_base_dir():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                path = f.read().strip()
                if os.path.exists(path):
                    return path
        except:
            pass
    # Use a dedicated folder in Documents and clear it on each start
    docs_dir = os.path.join(os.path.expanduser("~"), "Documents", "MediaViewer_Files")
    if os.path.exists(docs_dir):
        # Clear all files in the folder
        for filename in os.listdir(docs_dir):
            file_path = os.path.join(docs_dir, filename)
            try:
                if os.path.isfile(file_path):
                    os.remove(file_path)
            except Exception as e:
                print(f"Error removing file {file_path}: {e}")
    else:
        os.makedirs(docs_dir)
    return docs_dir

BASE_DIR = get_base_dir()

# Allow all common media formats
ALLOWED_EXTENSIONS = {
    # Video
    '.mp4', '.webm', '.ogg', '.avi', '.mov', '.mkv', '.m4v', '.flv', '.wmv',
    # Audio
    '.mp3', '.wav', '.m4a', '.aac', '.flac',
    # Images
    '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico',
    # Web
    '.html', '.htm'
}

@app.route('/api/folder', methods=['GET', 'POST'])
def manage_folder():
    global BASE_DIR
    if request.method == 'POST':
        data = request.json
        new_path = data.get('path')
        if new_path and os.path.exists(new_path):
            with open(CONFIG_FILE, "w", encoding="utf-8") as f:
                f.write(new_path)
            BASE_DIR = new_path
            return jsonify({"status": "success", "path": BASE_DIR})
        return jsonify({"status": "error", "message": "Invalid path"}), 400
    return jsonify({"path": BASE_DIR})

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
            elif ext in {'.mp3', '.wav', '.m4a', '.aac', '.flac'}:
                ftype = 'audio'
            elif ext in {'.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico'}:
                ftype = 'image'
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
        return jsonify({'status': 'error', 'message': f'Format {ext} not allowed'}), 400
    
    # Create BASE_DIR if it doesn't exist
    if not os.path.exists(BASE_DIR):
        os.makedirs(BASE_DIR)
        
    try:
        file_path = os.path.join(BASE_DIR, file.filename)
        file.save(file_path)
        print(f"File saved: {file_path}")
        return jsonify({'status': 'success', 'filename': file.filename})
    except Exception as e:
        print(f"Upload error: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


if __name__ == '__main__':
    print("Starting Flask server...")
    print(f"Base Directory: {BASE_DIR}")
    # Using port 5001 to avoid common conflicts
    app.run(debug=True, host='0.0.0.0', port=5001)
