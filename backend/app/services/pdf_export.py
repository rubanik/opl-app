import base64
import uuid
from io import BytesIO
from datetime import datetime
import re

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, Flowable, Image as RLImage
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

pdfmetrics.registerFont(TTFont('DejaVu', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DejaVu-Bold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DejaVu-Oblique', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf'))
pdfmetrics.registerFont(TTFont('DejaVu-BoldOblique', '/usr/share/fonts/truetype/dejavu/DejaVuSans-BoldOblique.ttf'))

_BOLD = 'DejaVu-Bold'
_REG = 'DejaVu'

_PRIMARY = colors.HexColor('#1565c0')
_PRIMARY_LIGHT = colors.HexColor('#e3f2fd')
_TEXT_DARK = colors.HexColor('#212121')
_TEXT_MID = colors.HexColor('#616161')
_TEXT_LIGHT = colors.HexColor('#9e9e9e')
_BORDER = colors.HexColor('#e0e0e0')

CONTENT_W = A4[0] - 40*mm
NUM_CIRCLE = 20*mm
STEP_CONTENT_W = CONTENT_W - NUM_CIRCLE - 4*mm

_styles = {
    'Title': ParagraphStyle('t', fontName=_BOLD, fontSize=20, leading=26,
                            textColor=colors.white, spaceAfter=0),
    'Subtitle': ParagraphStyle('st', fontName=_BOLD, fontSize=13, leading=17,
                               textColor=_TEXT_DARK, spaceAfter=2),
    'Body': ParagraphStyle('b', fontName=_REG, fontSize=10.5, leading=15,
                           textColor=_TEXT_MID, spaceAfter=2),
    'Small': ParagraphStyle('s', fontName=_REG, fontSize=8.5, leading=11,
                            textColor=_TEXT_LIGHT, spaceAfter=2),
    'Tag': ParagraphStyle('tg', fontName=_BOLD, fontSize=8, leading=10,
                          textColor=colors.white, spaceAfter=0),
    'Footer': ParagraphStyle('f', fontName=_REG, fontSize=8, leading=10,
                             textColor=_TEXT_LIGHT, alignment=TA_CENTER),
    'Desc': ParagraphStyle('d', fontName=_REG, fontSize=10.5, leading=14,
                           textColor=colors.HexColor('#90caf9'), spaceAfter=0),
    'NumText': ParagraphStyle('nt', fontName=_BOLD, fontSize=12, leading=16,
                              textColor=colors.white, alignment=TA_CENTER,
                              spaceBefore=0, spaceAfter=0),
}


class TagChip(Flowable):
    """Colored tag chip with text label."""
    def __init__(self, label, color_hex):
        Flowable.__init__(self)
        self._label = label
        self._color = colors.HexColor(color_hex)
        self._h = 10*mm
        tw = pdfmetrics.stringWidth(label, _BOLD, 8)
        pad = 5*mm
        self.width = max(tw + pad * 2, 10*mm)
        self.height = self._h

    def draw(self):
        c = self.canv
        c.setFillColor(self._color)
        c.roundRect(0, 0, self.width, self.height, 3, fill=1, stroke=0)
        c.setFont(_BOLD, 8)
        c.setFillColor(colors.white)
        c.drawString(3*mm, (self._h - 8) / 2 + 1, self._label)


def _num_circle(number):
    """Step number in a colored circle."""
    num_p = Paragraph(str(number), _styles['NumText'])
    sz = NUM_CIRCLE - 2*mm
    t = Table([[num_p]], colWidths=[sz], rowHeights=[sz])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), _PRIMARY),
        ('ROUNDEDCORNERS', 4),
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


def _build_photo_section(photos, available_w):
    """Build photo images for a step. Returns list of flowables."""
    if not photos:
        return []
    result = []
    max_show = min(len(photos), 2)
    photo_w = (available_w - 4*mm) / 2  # 2 per row, 4mm gap
    photo_h = photo_w * 0.75

    row_items = []
    for pi in range(max_show):
        try:
            img_buf = BytesIO(base64.b64decode(photos[pi]['data_base64']))
            img = RLImage(img_buf, width=photo_w, height=photo_h, hAlign='LEFT')
            row_items.append(img)
        except Exception:
            row_items.append(Spacer(1, photo_h))

    result.append(Table(
        [row_items],
        colWidths=[photo_w + 2*mm] * len(row_items),
    ))

    if len(photos) > 2:
        result.append(Paragraph(
            f"+{len(photos) - 2} фото",
            ParagraphStyle('pm', fontName=_REG, fontSize=8, leading=10,
                          textColor=_TEXT_LIGHT, spaceAfter=0)
        ))

    return result


def build_pdf(opl, steps, tags):
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=20*mm, rightMargin=20*mm,
        topMargin=18*mm, bottomMargin=18*mm,
        title=opl.get('title', ''),
    )
    story = []

    # ---- Header bar with colored background ----
    header_items = [
        Paragraph(opl['title'], _styles['Title']),
    ]
    if opl.get('description'):
        header_items.append(Spacer(1, 3))
        header_items.append(Paragraph(
            clean_html(opl['description']),
            _styles['Desc']
        ))

    header = Table(
        [[Paragraph("<br/>".join(
            [f"<font name='{_BOLD}' size='20' color='#ffffff'>{opl['title']}</font>"] +
            ([f"<br/><font name='{_REG}' size='10.5' color='#90caf9'>{clean_html(opl['description'])}</font>"]
             if opl.get('description') else [])
        ), ParagraphStyle('hdr', fontName=_REG, fontSize=1))]],
        colWidths=[CONTENT_W],
    )
    header.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), _PRIMARY),
        ('TOPPADDING', (0, 0), (-1, -1), 10*mm),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10*mm),
        ('LEFTPADDING', (0, 0), (-1, -1), 8*mm),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8*mm),
        ('ROUNDEDCORNERS', 0),
    ]))
    story.append(header)
    story.append(Spacer(1, 8*mm))

    # ---- Tags row ----
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
        story.append(Spacer(1, 5*mm))

    # ---- Date ----
    created = opl.get('created_at')
    if isinstance(created, str):
        created = datetime.fromisoformat(created.replace('Z', '+00:00'))
    story.append(Paragraph(
        f"Создано: {created.strftime('%d.%m.%Y %H:%M')}",
        _styles['Small']
    ))
    story.append(Spacer(1, 4*mm))

    # ---- Divider ----
    story.append(HRFlowable(width="100%", thickness=1.5, color=_PRIMARY, spaceAfter=2))
    story.append(Spacer(1, 6*mm))

    # ---- Steps ----
    for i, st in enumerate(steps):
        num_circle = _num_circle(st['step_number'])

        # Build right column content
        right_parts = []

        if st.get('title'):
            right_parts.append(Paragraph(st['title'], _styles['Subtitle']))

        dur_text = f"⏱ {fmt_dur(st.get('duration_sec', 0))}"
        dur_p = Paragraph(dur_text, _styles['Small'])
        right_parts.append(dur_p)

        txt = clean_html(st.get('description_html') or st.get('description') or '')
        if txt:
            right_parts.append(Spacer(1, 3))
            right_parts.append(Paragraph(txt, _styles['Body']))

        # Photos
        photos = st.get('photos', [])
        if photos:
            photo_items = _build_photo_section(photos, STEP_CONTENT_W)
            for pi in photo_items:
                right_parts.append(Spacer(1, 4*mm))
                right_parts.append(pi)

        # Build step table: num circle | content
        content_cell = right_parts[0] if right_parts else Paragraph(' ', _styles['Body'])

        step_table = Table(
            [[num_circle, content_cell]],
            colWidths=[NUM_CIRCLE, STEP_CONTENT_W],
        )
        step_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (0, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ]))
        story.append(step_table)

        # Remaining content (aligned under content column)
        for p in right_parts[1:]:
            spacer = Paragraph(' ', _styles['Body'])
            cont_table = Table(
                [[spacer, p]],
                colWidths=[NUM_CIRCLE, STEP_CONTENT_W],
            )
            cont_table.setStyle(TableStyle([
                ('TOPPADDING', (0, 0), (-1, -1), 0),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ]))
            story.append(cont_table)

        # Separator between steps
        if i < len(steps) - 1:
            story.append(Spacer(1, 4*mm))
            story.append(HRFlowable(width="85%", thickness=0.5, color=_BORDER, spaceAfter=2))
            story.append(Spacer(1, 4*mm))

    # ---- Footer ----
    story.append(Spacer(1, 15*mm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=_BORDER))
    story.append(Spacer(1, 3*mm))
    story.append(Paragraph(
        f"Документ сгенерирован: {datetime.now().strftime('%d.%m.%Y %H:%M')}",
        _styles['Footer']
    ))

    doc.build(story)
    buf.seek(0)
    return buf
