"""原始产品素材导出：只去白底、裁透明留白、贴已确认界面，不生成产品。"""
from pathlib import Path
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "related/website/public/assets/home-products-20260907"
OUT.mkdir(parents=True, exist_ok=True)


def export(image, name, width):
    image = image.convert("RGBA")
    image = image.crop(image.getchannel("A").getbbox())
    image.thumbnail((width, width), Image.Resampling.LANCZOS)
    image.save(OUT / f"{name}.webp", quality=96, method=6)
    print(name, image.size)


# 9.jpg 是单台平板的原始微侧角，不使用双机合影或 AI 网页图。
tablet = Image.open(ROOT / "analysis/materials/tablet/9.jpg").convert("RGBA")
tablet.thumbnail((2600, 2600), Image.Resampling.LANCZOS)
r, g, b, _ = tablet.split()
white = ImageChops.darker(ImageChops.darker(r, g), b)
tablet.putalpha(white.point(lambda v: max(0, min(255, (250 - v) * 25))))
export(tablet, "tablet-angle", 2400)

# 原始 4200×2366 透明渲染，人物、外壳、按键均直接保留。
ola = Image.open(ROOT / "related/project-background/assets/product/ola/renders/transparent/1-2.png")
export(ola, "ola-angle", 2200)


def perspective_coefficients(destination, source):
    """求目标到源的投影，Pillow 反向采样；无需重新绘制界面。"""
    rows = []
    for (x, y), (u, v) in zip(destination, source):
        rows.extend([
            [x, y, 1, 0, 0, 0, -u*x, -u*y, u],
            [0, 0, 0, x, y, 1, -v*x, -v*y, v],
        ])
    for i in range(8):
        pivot = max(range(i, 8), key=lambda k: abs(rows[k][i]))
        rows[i], rows[pivot] = rows[pivot], rows[i]
        scale = rows[i][i]
        rows[i] = [v / scale for v in rows[i]]
        for j in range(8):
            if j == i:
                continue
            scale = rows[j][i]
            rows[j] = [a - scale*b for a, b in zip(rows[j], rows[i])]
    return tuple(row[8] for row in rows)


nest = Image.open(ROOT / "analysis/materials/nest15/NEST 15/NEST 15/原木色-正右.png").convert("RGBA")
confirmed = Image.open(ROOT / "output/交付/修改清单与图片汇总-2026-09-06/01-最新确认/Nest15-原木外观与家庭食谱新界面.png")
# 只提取客户确认图的显示区域；原木框、白边、机身厚度来自原始侧角图。
screen = confirmed.crop((104, 452, 936, 919)).convert("RGBA")
w, h = screen.size
corners = [(405, 798), (2932, 908), (3210, 2504), (650, 2604)]
coeff = perspective_coefficients(corners, [(0, 0), (w, 0), (w, h), (0, h)])
warped = screen.transform(nest.size, Image.Transform.PERSPECTIVE, coeff, Image.Resampling.BICUBIC)
nest.alpha_composite(warped)
export(nest, "nest15-angle-confirmed", 2000)
