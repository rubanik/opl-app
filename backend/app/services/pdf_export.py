import base64
from io import BytesIO
from datetime import datetime
import re
import math

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, Flowable, Image as RLImage, PageBreak, KeepTogether
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
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

NUM_CIRCLE = 30*mm

_styles = {
    'Title': ParagraphStyle('t', fontName=_BOLD, fontSize=24, leading=30,
                            textColor=colors.white, spaceAfter=0),
    'Subtitle': ParagraphStyle('st', fontName=_BOLD, fontSize=14, leading=18,
                               textColor=_TEXT_DARK, spaceAfter=4),
    'Body': ParagraphStyle('b', fontName=_REG, fontSize=11, leading=16,
                           textColor=_TEXT_MID, spaceAfter=4),
    'Small': ParagraphStyle('s', fontName=_REG, fontSize=9, leading=12,
                            textColor=_TEXT_LIGHT, spaceAfter=2),
    'Footer': ParagraphStyle('f', fontName=_REG, fontSize=8, leading=10,
                             textColor=_TEXT_LIGHT, alignment=TA_CENTER),
    'NumText': ParagraphStyle('nt', fontName=_BOLD, fontSize=18, leading=24,
                              textColor=colors.white, alignment=TA_CENTER,
                              spaceBefore=0, spaceAfter=0),
    'StepNumPage': ParagraphStyle('snp', fontName=_BOLD, fontSize=10, leading=13,
                                  textColor=_TEXT_LIGHT, alignment=TA_CENTER, spaceAfter=0),
}


class TagChip(Flowable):
    def __init__(self, label, color_hex):
        Flowable.__init__(self)
        self._label = label
        self._color = colors.HexColor(color_hex)
        self._h = 11*mm
        tw = pdfmetrics.stringWidth(label, _BOLD, 9)
        pad = 5*mm
        self.width = max(tw + pad * 2, 12*mm)
        self.height = self._h

    def draw(self):
        c = self.canv
        c.setFillColor(self._color)
        c.roundRect(0, 0, self.width, self.height, 3, fill=1, stroke=0)
        c.setFont(_BOLD, 9)
        c.setFillColor(colors.white)
        c.drawString(3*mm, (self._h - 9) / 2 + 1, self._label)


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


def _build_photos_grid(photos, available_w):
    if not photos:
        return []
    result = []
    n = len(photos)
    cols = min(n, 3)
    rows = math.ceil(n / cols)
    gap = 3*mm
    photo_w = (available_w - gap * (cols - 1)) / cols
    photo_h = photo_w * 0.65

    grid = []
    for row in range(rows):
        row_cells = []
        for col in range(cols):
            idx = row * cols + col
            if idx >= n:
                row_cells.append(Spacer(1, photo_h))
                continue
            try:
                img_buf = BytesIO(base64.b64decode(photos[idx]['data_base64']))
                img = RLImage(img_buf, width=photo_w, height=photo_h, hAlign='LEFT')
                row_cells.append(img)
            except Exception:
                row_cells.append(Spacer(1, photo_h))
        grid.append(row_cells)

    for row_cells in grid:
        result.append(Table(
            [row_cells],
            colWidths=[photo_w] * cols,
        ))
        result.append(Spacer(1, gap))

    return result


def _build_header_page(opl, tags, steps_count):
    story = []
    header = Table(
        [[Paragraph(
            (f"<font name='{_BOLD}' size='24' color='#ffffff'>{opl['title']}</font>" +
             (f"<br/><font name='{_REG}' size='12' color='#90caf9'>{clean_html(opl['description'])}</font>"
              if opl.get('description') else "")),
            ParagraphStyle('hdr', fontName=_REG, fontSize=1)
        )]],
        colWidths=[CONTENT_W],
    )
    header.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), _PRIMARY),
        ('TOPPADDING', (0, 0), (-1, -1), 14*mm),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 14*mm),
        ('LEFTPADDING', (0, 0), (-1, -1), 10*mm),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10*mm),
    ]))
    story.append(header)
    story.append(Spacer(1, 10*mm))

    if tags:
        tag_chip = [TagChip(tg['name'], tg['color']) for tg in tags]
        tag_table = Table([tag_chip], colWidths=[tc.width + 3*mm for tc in tag_chip])
        tag_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-2, -1), 3*mm),
        ]))
        story.append(tag_table)
        story.append(Spacer(1, 6*mm))

    created = opl.get('created_at')
    if isinstance(created, str):
        created = datetime.fromisoformat(created.replace('Z', '+00:00'))
    story.append(Paragraph(
        f"Создано: {created.strftime('%d.%m.%Y %H:%M')}",
        _styles['Small']
    ))
    story.append(Spacer(1, 3*mm))
    story.append(Paragraph(
        f"Шагов: {steps_count}",
        _styles['Small']
    ))
    story.append(Spacer(1, 4*mm))
    story.append(HRFlowable(width="60%", thickness=1.5, color=_PRIMARY, spaceAfter=2))

    return story


def _build_step_page(st, total_steps, step_idx):
    story = []
    circle = _num_circle(st['step_number'])
    step_content_w = CONTENT_W - NUM_CIRCLE - 4*mm

    # Collect all right-side content into one list
    right = []
    if st.get('title'):
        right.append(Paragraph(st['title'], _styles['Subtitle']))

    dur_text = f"&nbsp;&nbsp;⏱ {fmt_dur(st.get('duration_sec', 0))}"
    right.append(Paragraph(dur_text, _styles['Small']))
    right.append(Spacer(1, 3*mm))
    right.append(HRFlowable(width="100%", thickness=1, color=_BORDER, spaceAfter=2))
    right.append(Spacer(1, 3*mm))

    txt = clean_html(st.get('description_html') or st.get('description') or '')
    if txt:
        right.append(Paragraph(txt, _styles['Body']))

    photos = st.get('photos', [])
    if photos:
        right.append(Spacer(1, 4*mm))
        photo_items = _build_photos_grid(photos, step_content_w)
        for pi in photo_items:
            right.append(pi)

    # Single 2-column table: circle | all content
    content_cell = right[0] if right else Paragraph(' ', _styles['Body'])
    step_table = Table(
        [[circle, content_cell]],
        colWidths=[NUM_CIRCLE, step_content_w],
    )
    step_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (0, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(step_table)

    # Remaining content rows aligned under content column
    for p in right[1:]:
        spacer = Paragraph(' ', _styles['Body'])
        cont_table = Table(
            [[spacer, p]],
            colWidths=[NUM_CIRCLE, step_content_w],
        )
        cont_table.setStyle(TableStyle([
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ]))
        story.append(cont_table)

    # Step counter
    story.append(Spacer(1, 8*mm))
    story.append(HRFlowable(width="40%", thickness=0.5, color=_BORDER))
    story.append(Spacer(1, 2*mm))
    story.append(Paragraph(
        f"Шаг {step_idx} из {total_steps}",
        _styles['StepNumPage']
    ))

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

    story.extend(_build_header_page(opl, tags, len(steps)))
    story.append(PageBreak())

    for i, st in enumerate(steps):
        story.extend(_build_step_page(st, len(steps), i + 1))
        if i < len(steps) - 1:
            story.append(PageBreak())

    doc.build(story)
    buf.seek(0)
    return buf
