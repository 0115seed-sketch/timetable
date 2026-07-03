from __future__ import annotations

import os
from datetime import datetime
from zoneinfo import ZoneInfo

import requests
from PIL import Image, ImageDraw, ImageFont

SEOUL_TZ = ZoneInfo("Asia/Seoul")

OFFICE_CODE = os.getenv("NEIS_OFFICE_CODE", "N10")
SCHOOL_CODE = os.getenv("NEIS_SCHOOL_CODE", "8140253")
GRADE = os.getenv("NEIS_GRADE", "2")
CLASS_NM = os.getenv("NEIS_CLASS", "9")
SCHOOL_LABEL = os.getenv("SCHOOL_LABEL", "천안업성고 2학년 9반")
OUTPUT_PATH = os.getenv("OG_OUTPUT_PATH", "assets/og/today_timetable.png")


def find_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = []
    if bold:
        candidates.extend(
            [
                "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
                "/usr/share/fonts/truetype/nanum/NanumGothicBold.ttf",
                "C:/Windows/Fonts/malgunbd.ttf",
            ]
        )
    else:
        candidates.extend(
            [
                "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
                "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
                "C:/Windows/Fonts/malgun.ttf",
            ]
        )

    for path in candidates:
        if os.path.exists(path):
            return ImageFont.truetype(path, size=size)

    return ImageFont.load_default()


def fetch_today_rows(api_key: str, today_ymd: str) -> list[dict]:
    params = {
        "KEY": api_key,
        "Type": "json",
        "pIndex": "1",
        "pSize": "100",
        "ATPT_OFCDC_SC_CODE": OFFICE_CODE,
        "SD_SCHUL_CODE": SCHOOL_CODE,
        "GRADE": GRADE,
        "CLASS_NM": CLASS_NM,
        "ALL_TI_YMD": today_ymd,
    }

    response = requests.get("https://open.neis.go.kr/hub/hisTimetable", params=params, timeout=20)
    response.raise_for_status()
    data = response.json()

    if data.get("RESULT", {}).get("CODE") == "INFO-200":
        return []

    return data.get("hisTimetable", [{}, {"row": []}])[1].get("row", [])


def clean_subject(raw: str) -> str:
    return str(raw or "").replace("*", "").strip()


def render_og(rows: list[dict], date_label: str) -> Image.Image:
    width, height = 1200, 630
    image = Image.new("RGB", (width, height), color="#f4f8ff")
    draw = ImageDraw.Draw(image)

    for y in range(height):
        t = y / height
        r = int(244 + (255 - 244) * t)
        g = int(248 + (240 - 248) * t)
        b = int(255 + (228 - 255) * t)
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    title_font = find_font(56, bold=True)
    body_font = find_font(36)
    small_font = find_font(28)

    draw.text((70, 56), f"{SCHOOL_LABEL} 오늘의 시간표", font=title_font, fill="#1f2a44")
    draw.text((72, 126), date_label, font=small_font, fill="#4c5a85")

    panel_x0, panel_y0 = 64, 180
    panel_x1, panel_y1 = width - 64, height - 64
    draw.rounded_rectangle((panel_x0, panel_y0, panel_x1, panel_y1), radius=28, fill="#ffffff", outline="#dbe4ff", width=2)

    if not rows:
        msg = "오늘은 등록된 시간표가 없습니다"
        draw.text((110, 290), msg, font=body_font, fill="#7080aa")
        return image

    rows = sorted(rows, key=lambda r: int(r.get("PERIO", 0)))
    y = 220
    for row in rows[:10]:
        period = str(row.get("PERIO", "?"))
        subject = clean_subject(row.get("ITRT_CNTNT", "-"))
        draw.text((110, y), f"{period}교시", font=body_font, fill="#2f80ed")
        draw.text((260, y), subject, font=body_font, fill="#1f2a44")
        y += 38

    return image


def main() -> None:
    api_key = os.getenv("NICE_API_KEY")
    if not api_key:
        raise RuntimeError("NICE_API_KEY environment variable is required")

    today = datetime.now(SEOUL_TZ)
    today_ymd = today.strftime("%Y%m%d")
    date_label = today.strftime("%Y.%m.%d (%a)")

    rows = fetch_today_rows(api_key, today_ymd)
    image = render_og(rows, date_label)

    output_dir = os.path.dirname(OUTPUT_PATH)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)

    image.save(OUTPUT_PATH)
    print(f"Saved OG image to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
