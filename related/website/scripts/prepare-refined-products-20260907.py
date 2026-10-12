"""导出用户指定平板组合，以及用户授权的 LibTV OLA 修复图。"""
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw

ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / 'output/libtv/floors-3-4-refinement-2026-09-07'
OUT = ROOT / 'related/website/public/assets/home-products-refined-20260907'
OUT.mkdir(parents=True, exist_ok=True)


def export(source, name):
    image = Image.open(source).convert('RGB')
    image.thumbnail((4096, 4096), Image.Resampling.LANCZOS)
    r, g, b = image.split()
    # 只清除和画面外沿相连的白底；保留设备内部白色标志与角色细节。
    white = ImageChops.darker(ImageChops.darker(r, g), b).point(lambda x: 255 if x > 242 else 0)
    ImageDraw.floodfill(white, (0, 0), 128)
    alpha = white.point(lambda x: 0 if x == 128 else 255)
    if name == 'tablet-pair':
        # 底部投影形成封闭白区；仅清理机身下段外围，避开中部白色品牌字。
        bottom = int(image.height * .72)
        luminance = ImageChops.darker(ImageChops.darker(r, g), b)
        fade = luminance.point(lambda x: max(0, min(255, (242 - x) * 8)))
        region = (0, bottom, image.width, image.height)
        alpha.paste(ImageChops.darker(alpha.crop(region), fade.crop(region)), region)
    image.putalpha(alpha)
    image = image.crop(alpha.getbbox())
    image.save(OUT / f'{name}.webp', quality=96, method=6)
    print(name, image.size)


if __name__ == '__main__':
    export(SOURCE / 'source/tablet-original.jpg', 'tablet-pair')
    generated = list((SOURCE / 'final-4k').glob('*.png'))
    if generated:
        export(generated[0], 'ola-repaired')
