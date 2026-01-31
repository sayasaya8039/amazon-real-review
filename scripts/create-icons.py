#!/usr/bin/env python3
"""Chrome拡張機能用のアイコンを生成するスクリプト"""

from PIL import Image, ImageDraw, ImageFont
import os

# アイコンサイズ
SIZES = [16, 32, 48, 128]

# 出力ディレクトリ
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'icons')

def create_icon(size: int) -> Image.Image:
    """サクラ探知機のアイコンを作成"""
    # 背景色（グラデーション風）
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 背景円（ピンク〜赤のグラデーション風）
    padding = size // 16 if size >= 32 else 0
    circle_bbox = [padding, padding, size - padding - 1, size - padding - 1]

    # メインの円（桜色）
    draw.ellipse(circle_bbox, fill=(255, 182, 193, 255))  # ライトピンク

    # 内側の円（少し濃いピンク）
    inner_padding = size // 8
    inner_bbox = [inner_padding, inner_padding, size - inner_padding - 1, size - inner_padding - 1]
    draw.ellipse(inner_bbox, fill=(255, 105, 180, 255))  # ホットピンク

    # 桜の花びらを描く（簡略化）
    center = size // 2
    petal_size = size // 4

    if size >= 32:
        # 5枚の花びら
        import math
        for i in range(5):
            angle = math.radians(i * 72 - 90)
            x = center + int(petal_size * 0.6 * math.cos(angle))
            y = center + int(petal_size * 0.6 * math.sin(angle))
            petal_radius = petal_size // 2
            draw.ellipse(
                [x - petal_radius, y - petal_radius, x + petal_radius, y + petal_radius],
                fill=(255, 255, 255, 200)
            )

        # 中心の円
        center_radius = size // 10
        draw.ellipse(
            [center - center_radius, center - center_radius,
             center + center_radius, center + center_radius],
            fill=(255, 215, 0, 255)  # ゴールド
        )

    # 虫眼鏡（検出を表す）
    if size >= 48:
        glass_center_x = center + size // 5
        glass_center_y = center + size // 5
        glass_radius = size // 6

        # 虫眼鏡の円
        draw.ellipse(
            [glass_center_x - glass_radius, glass_center_y - glass_radius,
             glass_center_x + glass_radius, glass_center_y + glass_radius],
            outline=(70, 70, 70, 255),
            width=max(2, size // 32)
        )

        # 虫眼鏡の柄
        handle_length = size // 5
        handle_start_x = glass_center_x + int(glass_radius * 0.7)
        handle_start_y = glass_center_y + int(glass_radius * 0.7)
        draw.line(
            [handle_start_x, handle_start_y,
             handle_start_x + handle_length // 2, handle_start_y + handle_length // 2],
            fill=(70, 70, 70, 255),
            width=max(2, size // 24)
        )

    # 警告マーク（小さいサイズ用）
    if size <= 32:
        warning_size = size // 3
        warning_x = center
        warning_y = center

        # 三角形の警告マーク
        triangle = [
            (warning_x, warning_y - warning_size // 2),
            (warning_x - warning_size // 2, warning_y + warning_size // 2),
            (warning_x + warning_size // 2, warning_y + warning_size // 2)
        ]
        draw.polygon(triangle, fill=(255, 69, 0, 255))  # オレンジレッド

        # 感嘆符
        if size >= 24:
            draw.line(
                [warning_x, warning_y - warning_size // 4, warning_x, warning_y + warning_size // 8],
                fill=(255, 255, 255, 255),
                width=max(1, size // 16)
            )

    return img


def main():
    # 出力ディレクトリを作成
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    for size in SIZES:
        icon = create_icon(size)
        output_path = os.path.join(OUTPUT_DIR, f'icon{size}.png')
        icon.save(output_path, 'PNG')
        print(f'Created: icon{size}.png')

    print(f'\nIcons saved to: {OUTPUT_DIR}')


if __name__ == '__main__':
    main()
