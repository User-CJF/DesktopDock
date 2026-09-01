from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "DesktopDock.png"
TARGET = ROOT / "assets" / "DesktopDock.ico"

image = Image.open(SOURCE).convert("RGBA")
canvas = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
scaled = image.resize((256, 256), Image.Resampling.LANCZOS)
canvas.alpha_composite(scaled)
canvas.save(TARGET, format="ICO", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
print(TARGET)
