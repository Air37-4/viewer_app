import os
import shutil
from flask import Flask, render_template, jsonify, send_from_directory, request

app = Flask(__name__)

CONFIG_FILE = "config.txt"

def get_base_dir():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                path = f.read().strip()
                if os.path.exists(path):
                    return path
        except:
            pass
    # Fallback to Downloads folder if Лена doesn't exist
    default_path = r"C:\Users\air37\Downloads\Лена"
    if os.path.exists(default_path):
        return default_path
    return os.path.expanduser("~\\Downloads")

BASE_DIR = get_base_dir()

# Allow all common media formats
ALLOWED_EXTENSIONS = {'.html', '.htm', '.mp4', '.webm', '.ogg', '.mp3', '.wav', '.avi', '.mov', '.mkv', '.m4v', '.flv', '.wmv', '.m4a', '.aac', '.flac'}

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

@app.route('/api/add_link', methods=['POST'])
def add_link():
    data = request.json
    url = data.get('url')
    name = data.get('name')
    
    if not url or not name:
        return jsonify({'status': 'error', 'message': 'Missing URL or Name'}), 400
        
    # Sanitize filename
    safe_name = "".join([c for c in name if c.isalpha() or c.isdigit() or c in (' ', '-', '_')]).strip()
    if not safe_name:
        safe_name = "link"
    
    filename = f"{safe_name}.html"
    file_path = os.path.join(BASE_DIR, filename)
    
    # Handle YouTube links
    embed_url = url
    if "youtube.com/watch" in url:
        try:
            video_id = url.split("v=")[1].split("&")[0]
            embed_url = f"https://www.youtube.com/embed/{video_id}?autoplay=1&mute=1&loop=1&playlist={video_id}"
        except:
            pass
    elif "youtu.be/" in url:
        try:
            video_id = url.split("youtu.be/")[1].split("?")[0]
            embed_url = f"https://www.youtube.com/embed/{video_id}?autoplay=1&mute=1&loop=1&playlist={video_id}"
        except:
            pass
            
    # Create HTML wrapper
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
<style>
    body {{ margin: 0; background: #000; display: flex; justify-content: center; align-items: center; height: 100vh; overflow: hidden; }}
    iframe, video {{ width: 100%; height: 100%; border: none; }}
</style>
</head>
<body>
    <iframe src="{embed_url}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>
</body>
</html>
    """
    
    # If it looks like a direct video file, use video tag instead
    if url.lower().endswith(('.mp4', '.webm', '.ogg', '.mov')):
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
<style>
    body {{ margin: 0; background: #000; display: flex; justify-content: center; align-items: center; height: 100vh; overflow: hidden; }}
    video {{ width: 100%; height: 100%; object-fit: contain; }}
</style>
</head>
<body>
    <video src="{url}" autoplay loop muted playsinline controls></video>
</body>
</html>
        """
        
    try:
        # Create BASE_DIR if it doesn't exist
        if not os.path.exists(BASE_DIR):
            os.makedirs(BASE_DIR)
            
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(html_content)
            
        return jsonify({'status': 'success', 'filename': filename})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    print("Starting Flask server...")
    print(f"Base Directory: {BASE_DIR}")
    # Using port 5001 to avoid common conflicts
    app.run(debug=True, host='0.0.0.0', port=5001)
