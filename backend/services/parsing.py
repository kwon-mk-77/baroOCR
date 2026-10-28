import re
from datetime import date
from typing import Optional

_NUM_RE = re.compile(r"^\s*([-+]?[\d,]*\.?\d+)\s*(.*)$")


def split_number_unit(value) -> tuple[Optional[float], str]:
    """'150포' -> (150.0, '포'), '3.5 ton' -> (3.5, 'ton'), '' -> (None, '')"""
    if value is None:
        return None, ""
    if isinstance(value, (int, float)):
        return float(value), ""
    text = str(value).strip()
    if not text:
        return None, ""
    m = _NUM_RE.match(text)
    if not m:
        return None, text
    try:
        num = float(m.group(1).replace(",", ""))
    except ValueError:
        return None, text
    return num, m.group(2).strip()


def parse_date(value) -> Optional[date]:
    """'2026-10-29', '2026.10.29', '2026/10/29', '26.10.29' 등을 date로 변환"""
    if not value:
        return None
    nums = re.findall(r"\d+", str(value))
    if len(nums) < 3:
        return None
    y, m, d = (int(n) for n in nums[:3])
    if y < 100:
        y += 2000
    try:
        return date(y, m, d)
    except ValueError:
        return None
