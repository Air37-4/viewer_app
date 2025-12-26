import os
import shutil
import zipfile
from datetime import datetime

def create_zip():
    """Create a ZIP archive of the application for distribution"""
    print("Creating ZIP archive...")
    
    # Get the current directory
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Create a timestamp for the zip filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    zip_filename = f"MediaViewer_{timestamp}.zip"
    
    # Files and directories to include
    include_items = [
        'app.py',
        'desktop_app.py',
        'templates',
        'static',
        'app_icon.ico',
        'README.md',
        '.gitignore',
        'Viewer.spec',
        'VideoGallery.spec',
        'package_dist.py',
        'create_zip.py'
    ]
    
    # Optional files
    optional_items = ['requirements.txt']
    
    # Add optional items if they exist
    for item in optional_items:
        item_path = os.path.join(base_dir, item)
        if os.path.exists(item_path):
            include_items.append(item)
    
    # Files and directories to exclude
    exclude_items = [
        '__pycache__',
        '*.pyc',
        '.git',
        'dist',
        'build',
        '.venv',
        'venv',
        'env',
        '.env',
        'viewer_config_v2.txt'
    ]
    
    # Create zip file
    with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for item in include_items:
            item_path = os.path.join(base_dir, item)
            if os.path.exists(item_path):
                if os.path.isfile(item_path):
                    # Add file
                    zipf.write(item_path, item)
                    print(f"Added: {item}")
                elif os.path.isdir(item_path):
                    # Add directory recursively
                    for root, dirs, files in os.walk(item_path):
                        # Filter out excluded directories
                        dirs[:] = [d for d in dirs if d not in exclude_items and not d.startswith('.')]
                        
                        for file in files:
                            # Skip excluded files
                            if file.endswith('.pyc') or file.startswith('.'):
                                continue
                                
                            file_path = os.path.join(root, file)
                            arcname = os.path.relpath(file_path, base_dir)
                            zipf.write(file_path, arcname)
                            print(f"Added: {arcname}")
            else:
                print(f"Warning: {item} not found, skipping...")
    
    print(f"\nZIP archive created: {zip_filename}")
    print(f"Location: {os.path.abspath(zip_filename)}")
    return zip_filename

if __name__ == "__main__":
    create_zip()

