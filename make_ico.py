import os
from PIL import Image

def convert_to_ico(png_path, ico_path):
    img = Image.open(png_path)
    # Standard sizes for Windows ICO
    icon_sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (255, 255)]
    img.save(ico_path, sizes=icon_sizes)
    print(f"Icon saved to {ico_path}")

if __name__ == "__main__":
    # The path to the generated image
    png_source = r"C:\Users\air37\.gemini\antigravity\brain\396596cb-c689-4304-9b4d-b6a6a5ffe3a2\app_icon_design_1766221002225.png"
    ico_dest = r"c:\Users\air37\Downloads\viewer_app\app_icon.ico"
    if os.path.exists(png_source):
        convert_to_ico(png_source, ico_dest)
    else:
        print(f"Source PNG not found at {png_source}")
