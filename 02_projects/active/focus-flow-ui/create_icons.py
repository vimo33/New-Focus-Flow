#!/usr/bin/env python3
"""
Generate PWA icons from SVG or create placeholder PNGs
Run with: python3 create_icons.py
"""

import os
import struct
import zlib
from pathlib import Path

def create_png_header():
    """Create PNG file signature"""
    return bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

def create_crc32(data):
    """Calculate CRC32 checksum"""
    crc = 0xffffffff
    for byte in data:
        crc ^= byte
        for _ in range(8):
            if crc & 1:
                crc = (crc >> 1) ^ 0xedb88320
            else:
                crc >>= 1
    return crc ^ 0xffffffff

def create_chunk(chunk_type, data):
    """Create a PNG chunk"""
    length = struct.pack('>I', len(data))
    chunk_data = chunk_type.encode() + data
    crc = struct.pack('>I', create_crc32(chunk_data) & 0xffffffff)
    return length + chunk_data + crc

def create_simple_png(size, filename):
    """Create a simple PNG with theme colors"""
    # Theme colors
    bg_color = (0x10, 0x19, 0x22)  # Dark background
    theme_color = (0x13, 0x7f, 0xec)  # Bright theme

    # Create IHDR
    ihdr_data = struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)
    ihdr = create_chunk('IHDR', ihdr_data)

    # Create image data
    scanline_size = size * 3 + 1
    img_data = bytearray()

    for y in range(size):
        img_data.append(0)  # Filter type
        for x in range(size):
            # Create circular gradient
            cx, cy = size / 2, size / 2
            dx, dy = x - cx, y - cy
            distance = (dx * dx + dy * dy) ** 0.5
            max_distance = ((cx * cx) + (cy * cy)) ** 0.5
            ratio = min(distance / max_distance, 1.0)

            if ratio < 0.6:
                # Inner circle
                color = theme_color
            elif ratio < 0.7:
                # Border interpolation
                t = 1 - ratio
                color = (
                    int(bg_color[0] + (theme_color[0] - bg_color[0]) * t),
                    int(bg_color[1] + (theme_color[1] - bg_color[1]) * t),
                    int(bg_color[2] + (theme_color[2] - bg_color[2]) * t)
                )
            else:
                # Outer area
                color = bg_color

            img_data.extend(color)

    # Compress and create IDAT
    compressed = zlib.compress(bytes(img_data), 9)
    idat = create_chunk('IDAT', compressed)

    # Create IEND
    iend = create_chunk('IEND', b'')

    # Combine all chunks
    png = create_png_header() + ihdr + idat + iend

    # Write to file
    with open(filename, 'wb') as f:
        f.write(png)

    return os.path.getsize(filename)

def main():
    icons_dir = Path(__file__).parent / 'public' / 'icons'
    icons_dir.mkdir(parents=True, exist_ok=True)

    # Generate icon sizes
    sizes = [72, 96, 128, 144, 152, 192, 384, 512]

    print('Creating PWA icons...')
    for size in sizes:
        icon_path = icons_dir / f'icon-{size}x{size}.png'
        file_size = create_simple_png(size, str(icon_path))
        print(f'  Created: icon-{size}x{size}.png ({file_size} bytes)')

    # Create screenshot placeholders
    print('\nCreating screenshot placeholders...')
    screenshot_configs = [
        (540, 720, 'screenshot-540x720.png'),
        (1280, 720, 'screenshot-1280x720.png')
    ]

    for width, height, filename in screenshot_configs:
        # Create simple solid color screenshot
        bg_color = (0x13, 0x7f, 0xec)  # Theme color for screenshots

        ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
        ihdr = create_chunk('IHDR', ihdr_data)

        img_data = bytearray()
        for y in range(height):
            img_data.append(0)  # Filter type
            for x in range(width):
                img_data.extend(bg_color)

        compressed = zlib.compress(bytes(img_data), 9)
        idat = create_chunk('IDAT', compressed)
        iend = create_chunk('IEND', b'')

        png = create_png_header() + ihdr + idat + iend

        screenshot_path = icons_dir / filename
        with open(screenshot_path, 'wb') as f:
            f.write(png)

        file_size = os.path.getsize(screenshot_path)
        print(f'  Created: {filename} ({width}x{height}, {file_size} bytes)')

    print('\nAll icons created successfully!')
    print('Location: public/icons/')

if __name__ == '__main__':
    main()
