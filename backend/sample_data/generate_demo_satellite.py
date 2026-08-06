"""
Демо "спутниктік" сурет генераторы — нақты Sentinel Hub тіркелгісі болмаған
жағдайда anomaly_detection модулін сынау/демонстрациялау үшін. Синтетикалық
су беті текстурасы + мұнай дағына ұқсас қараңғы тегіс дақ салады.

Қолданылуы:
    python -m sample_data.generate_demo_satellite
"""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter


def generate(path: str = "sample_data/demo_satellite.jpg", seed: int = 7):
    rng = np.random.default_rng(seed)
    w, h = 800, 600

    # Судың негізгі түсі + ұсақ толқындық шуыл текстурасы
    base = np.zeros((h, w, 3), dtype=np.float64)
    base[:, :] = [28, 74, 94]  # қою көк-жасыл су түсі

    noise = rng.normal(0, 9, (h, w, 1))
    xx, yy = np.meshgrid(np.linspace(0, 12, w), np.linspace(0, 9, h))
    wave = (np.sin(xx * 3.1) * np.cos(yy * 2.7) * 6)[:, :, None]
    base += noise + wave
    base = np.clip(base, 0, 255).astype(np.uint8)

    img = Image.fromarray(base, mode="RGB")
    img = img.filter(ImageFilter.GaussianBlur(0.6))
    draw = ImageDraw.Draw(img)

    # "Мұнай дағы" — қараңғы, тегіс, дөңгелек емес пішінді дақ
    cx, cy = 480, 260
    points = []
    for i in range(24):
        angle = i / 24 * 2 * np.pi
        r = 70 + 22 * np.sin(angle * 3) + rng.normal(0, 5)
        points.append((cx + r * np.cos(angle), cy + r * 0.6 * np.sin(angle)))
    draw.polygon(points, fill=(14, 32, 40))

    img = img.filter(ImageFilter.GaussianBlur(1.2))

    # Кеменің жіңішке ізі (тағы бір ықтимал аномалия, кішірек)
    draw2 = ImageDraw.Draw(img)
    draw2.line([(560, 420), (640, 460), (700, 470)], fill=(20, 45, 55), width=9)
    img = img.filter(ImageFilter.GaussianBlur(0.4))

    img.save(path, quality=90)
    print(f"Демо сурет сақталды: {path}")


if __name__ == "__main__":
    import os

    os.makedirs("sample_data", exist_ok=True)
    generate()
