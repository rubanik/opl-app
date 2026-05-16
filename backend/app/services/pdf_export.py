import base64
from io import BytesIO
from datetime import datetime
import re
import math

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, Flowable, Image as RLImage, PageBreak, KeepTogether,
)
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

pdfmetrics.registerFont(TTFont('DejaVu', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DejaVu-Bold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))

_BOLD = 'DejaVu-Bold'
_REG = 'DejaVu'

_PRIMARY = colors.HexColor('#1565c0')
_TEXT_DARK = colors.HexColor('#212121')
_TEXT_MID = colors.HexColor('#616161')
_TEXT_LIGHT = colors.HexColor('#9e9e9e')
_BORDER = colors.HexColor('#e0e0e0')

PAGE_W, PAGE_H = A4[1], A4[0]
MARGIN_X = 20*mm
MARGIN_Y = 18*mm
CONTENT_W = PAGE_W - MARGIN_X * 2
CONTENT_H = PAGE_H - MARGIN_Y * 2

NUM_CIRCLE = 24*mm

_styles = {
    'Title': ParagraphStyle('t', fontName=_BOLD, fontSize=22, leading=28,
                            textColor=colors.white, spaceAfter=0),
    'Subtitle': ParagraphStyle('st', fontName=_BOLD, fontSize=13, leading=17,
                               textColor=_TEXT_DARK, spaceAfter=3),
    'Body': ParagraphStyle('b', fontName=_REG, fontSize=10.5, leading=14.5,
                           textColor=_TEXT_MID, spaceAfter=3),
    'Small': ParagraphStyle('s', fontName=_REG, fontSize=8.5, leading=11,
                            textColor=_TEXT_LIGHT, spaceAfter=1),
    'NumText': ParagraphStyle('nt', fontName=_BOLD, fontSize=14, leading=20,
                              textColor=colors.white, alignment=TA_CENTER,
                              spaceBefore=0, spaceAfter=0),
    'StepNumPage': ParagraphStyle('snp', fontName=_BOLD, fontSize=9, leading=12,
                                  textColor=_TEXT_LIGHT, alignment=TA_CENTER, spaceAfter=0),
}


class TagChip(Flowable):
    def __init__(self, label, color_hex):
        Flowable.__init__(self)
        self._label = label
        self._color = colors.HexColor(color_hex)
        self._h = 10*mm
        tw = pdfmetrics.stringWidth(label, _BOLD, 8)
        pad = 4*mm
        self.width = max(tw + pad * 2, 10*mm)
        self.height = self._h

    def draw(self):
        c = self.canv
        c.setFillColor(self._color)
        c.roundRect(0, 0, self.width, self.height, 3, fill=1, stroke=0)
        c.setFont(_BOLD, 8)
        c.setFillColor(colors.white)
        c.drawString(2*mm, (self._h - 8) / 2 + 1, self._label)


def _num_circle(number):
    num_p = Paragraph(str(number), _styles['NumText'])
    sz = NUM_CIRCLE - 2*mm
    t = Table([[num_p]], colWidths=[sz], rowHeights=[sz])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), _PRIMARY),
        ('ROUNDEDCORNERS', (4, 4, 4, 4)),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    return t


def fmt_dur(sec):
    if not sec:
        return "0 сек"
    m, s = divmod(sec, 60)
    parts = []
    if m:
        parts.append(f"{m} мин")
    if s:
        parts.append(f"{s} сек")
    return " ".join(parts)


def clean_html(text):
    if not text:
        return ""
    t = text
    t = t.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>').replace('&quot;', '"')
    t = t.replace('<strong>', '<b>').replace('</strong>', '</b>')
    t = t.replace('<em>', '<i>').replace('</em>', '</i>')
    t = t.replace('<br/>', '<br/>').replace('<br>', '<br/>')
    t = re.sub(r'<h[1-6][^>]*>(.*?)</h[1-6]>', r'<b>\1</b>', t, flags=re.DOTALL)
    t = re.sub(r'<p[^>]*>(.*?)</p>', r'\1<br/>', t, flags=re.DOTALL)
    t = re.sub(r'<li[^>]*>(.*?)</li>', r'\1<br/>', t, flags=re.DOTALL)
    t = re.sub(r'</?u?l[^>]*>', '', t, flags=re.DOTALL)
    t = re.sub(r'<[^>]+>', '', t)
    return t.strip()


def _make_photos(photos, avail_w, avail_h):
    """Return list of flowables (tables) of photos that fit in avail_h."""
    if not photos or avail_h < 10*mm:
        return []
    n = len(photos)
    cols = min(n, 3)
    rows = math.ceil(n / cols)
    gap = 2*mm
    pw = (avail_w - gap * (cols - 1)) / cols
    ph_fit = (avail_h - gap * (rows - 1)) / rows
    aspect = 0.65
    ph = min(ph_fit, pw * aspect)
    pw = min(pw, ph / aspect)

    grid = []
    for r in range(rows):
        cells = []
        for c in range(cols):
            idx = r * cols + c
            if idx >= n:
                cells.append(Spacer(1, ph))
                continue
            try:
                img_buf = BytesIO(base64.b64decode(photos[idx]['data_base64']))
                img = RLImage(img_buf, width=pw, height=ph, hAlign='LEFT')
                cells.append(img)
            except Exception:
                cells.append(Spacer(1, ph))
        grid.append(Table([cells], colWidths=[pw] * cols))
        if r < rows - 1:
            grid.append(Spacer(1, gap))
    return grid


def _make_header(opl, tags, steps_count):
    story = []
    header = Table(
        [[Paragraph(
            (f"<font name='{_BOLD}' size='22' color='#ffffff'>{opl['title']}</font>" +
             (f"<br/><font name='{_REG}' size='11' color='#90caf9'>{clean_html(opl['description'])}</font>"
              if opl.get('description') else "")),
            ParagraphStyle('hdr', fontName=_REG, fontSize=1)
        )]],
        colWidths=[CONTENT_W],
    )
    header.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), _PRIMARY),
        ('TOPPADDING', (0, 0), (-1, -1), 12*mm),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12*mm),
        ('LEFTPADDING', (0, 0), (-1, -1), 8*mm),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8*mm),
    ]))
    story.append(header)
    story.append(Spacer(1, 8*mm))

    if tags:
        chips = [TagChip(tg['name'], tg['color']) for tg in tags]
        tt = Table([chips], colWidths=[ch.width + 2*mm for ch in chips])
        tt.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('RIGHTPADDING', (0, 0), (-2, -1), 2*mm),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ]))
        story.append(tt)
        story.append(Spacer(1, 5*mm))

    created = opl.get('created_at')
    if isinstance(created, str):
        created = datetime.fromisoformat(created.replace('Z', '+00:00'))
    story.append(Paragraph(f"Создано: {created.strftime('%d.%m.%Y %H:%M')}", _styles['Small']))
    story.append(Spacer(1, 2*mm))
    story.append(Paragraph(f"Шагов: {steps_count}", _styles['Small']))
    story.append(Spacer(1, 3*mm))
    story.append(HRFlowable(width="50%", thickness=1.5, color=_PRIMARY, spaceAfter=2))
    return story


def _make_step(st, total, idx):
    """Build all flowables for one step."""
    right = []
    if st.get('title'):
        right.append(Paragraph(st['title'], _styles['Subtitle']))
    right.append(Paragraph(f"&nbsp;&nbsp;⏱ {fmt_dur(st.get('duration_sec', 0))}", _styles['Small']))
    right.append(Spacer(1, 2*mm))
    right.append(HRFlowable(width="100%", thickness=0.8, color=_BORDER, spaceAfter=1))
    right.append(Spacer(1, 2*mm))

    txt = clean_html(st.get('description_html') or st.get('description') or '')
    if txt:
        right.append(Paragraph(txt, _styles['Body']))

    # Estimate available height for photos
    used_h = NUM_CIRCLE + 25*mm + 10*mm  # circle + title/dur/line + footer area
    desc_est = len(txt) * 0.08 * mm if txt else 0
    avail_h = CONTENT_H - used_h - desc_est
    avail_w = CONTENT_W - NUM_CIRCLE - 4*mm

    photos = st.get('photos', [])
    if photos:
        right.append(Spacer(1, 3*mm))
        for pf in _make_photos(photos, avail_w, avail_h):
            right.append(pf)

    circle = _num_circle(st['step_number'])
    first = right[0] if right else Paragraph(' ', _styles['Body'])

    t = Table([[circle, first]], colWidths=[NUM_CIRCLE, avail_w])
    t.setStyle(TableStyle([
        ('VALIGN', (0, 0), (0, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    story = [t]

    for p in right[1:]:
        ct = Table([[Paragraph(' ', _styles['Body']), p]], colWidths=[NUM_CIRCLE, avail_w])
        ct.setStyle(TableStyle([
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ]))
        story.append(ct)

    story.append(Spacer(1, 6*mm))
    story.append(HRFlowable(width="30%", thickness=0.5, color=_BORDER))
    story.append(Spacer(1, 2*mm))
    story.append(Paragraph(f"Шаг {idx} из {total}", _styles['StepNumPage']))
    return story


def build_pdf(opl, steps, tags):
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=(PAGE_W, PAGE_H),
        leftMargin=MARGIN_X, rightMargin=MARGIN_X,
        topMargin=MARGIN_Y, bottomMargin=MARGIN_Y,
        title=opl.get('title', ''),
    )
    story = []
    story.extend(_make_header(opl, tags, len(steps)))
    story.append(PageBreak())

    for i, st in enumerate(steps):
        step_items = _make_step(st, len(steps), i + 1)
        story.append(KeepTogether(step_items))
        if i < len(steps) - 1:
            story.append(PageBreak())

    doc.build(story)
    buf.seek(0)
    return buf
