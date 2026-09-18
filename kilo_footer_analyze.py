"""Analiza la forma del footer (trust bar + badge GAME ON) en una imagen."""
import sys
from PIL import Image

def is_neon(r, g, b):
    return r > 110 and b > 110 and (r + b) > 250

def scan(path, y0, y1, x0, x1, step=1):
    img = Image.open(path).convert("RGB")
    px = img.load()
    out = []
    for y in range(y0, y1, step):
        left = -1
        right = -1
        count = 0
        # Detectar transiciones izq/der (sin contar gaps interiores)
        runs = []
        run_start = None
        for x in range(x0, x1):
            r, g, b = px[x, y]
            if is_neon(r, g, b):
                if run_start is None:
                    run_start = x
                right = x
                count += 1
            else:
                if run_start is not None:
                    runs.append((run_start, right))
                    run_start = None
        if run_start is not None:
            runs.append((run_start, right))
        out.append((y, runs, count))
    return img.size, out

def ascii_map(path, y0, y1, x0, x1, cell=4):
    img = Image.open(path).convert("RGB")
    w, h = img.size
    cols = (x1 - x0) // cell
    rows = (y1 - y0) // cell
    lines = []
    for ry in range(rows):
        line = []
        for cx in range(cols):
            ys = y0 + ry * cell
            xs = x0 + cx * cell
            # Samplear el centro del cell
            r, g, b = img.getpixel((xs + cell // 2, ys + cell // 2))
            if is_neon(r, g, b):
                line.append('#')
            elif (r + g + b) > 240:
                line.append('o')  # texto blanco u otro highlight
            elif (r + b) > 120 and g < 100:
                line.append(':')  # rosa/magenta tenue
            elif r + g + b < 30:
                line.append(' ')
            else:
                line.append('.')
        lines.append(''.join(line))
    return lines

if __name__ == "__main__":
    path = sys.argv[1]
    y0 = int(sys.argv[2])
    y1 = int(sys.argv[3])
    x0 = int(sys.argv[4])
    x1 = int(sys.argv[5])
    cell = int(sys.argv[6]) if len(sys.argv) > 6 else 4

    print(f"=== {path}  region y={y0}..{y1}  x={x0}..{x1}  cell={cell} ===")
    # Borde analysis
    _, rows = scan(path, y0, y1, x0, x1, step=2)
    for y, runs, count in rows:
        rs = " ".join(f"[{a}-{b}]" for a, b in runs)
        print(f"  y={y:4}  count={count:4}  runs={rs}")
    print()
    print("ASCII MAP:")
    for line in ascii_map(path, y0, y1, x0, x1, cell):
        print("  " + line)
