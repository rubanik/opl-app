import uuid
from io import BytesIO
from datetime import datetime
import re

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, Flowable
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER

_styles = {
    'Title': ParagraphStyle(
        'opl_title',
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        spaceAfter=6,
        textColor=colors.HexColor('#1976d2'),
    ),
    'Subtitle': ParagraphStyle(
        'opl_subtitle',
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        spaceAfter=2,
        textColor=colors.HexColor('#333333'),
    ),
    'Body': ParagraphStyle(
        'opl_body',
        fontName='Helvetica',
        fontSize=10,
        leading=13,
        spaceAfter=4,
        textColor=colors.HexColor('#555555'),
    ),
    'Small': ParagraphStyle(
        'opl_small',
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        spaceAfter=4,
        textColor=colors.HexColor('#888888'),
    ),
    'Footer': ParagraphStyle(
        'opl_footer',
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#999999'),
        alignment=TA_CENTER,
    ),
    'Normal': getSampleStyleSheet()['Normal'],
}

_CONTENT_WIDTH = A4[0] - 40*mm
_NUM_BOX = 18*mm
_DESC_BOX = _CONTENT_WIDTH - _NUM_BOX


class ColoredRect(Flowable):
    def __init__(self, w, h, fill):
        Flowable.__init__(self)
        self.width = w
        self.height = h
        self._fill = fill

    def draw(self):
        c = self.canv
        c.setFillColor(self._fill)
        c.setStrokeColor(colors.white)
        c.setLineWidth(0.3)
        c.roundRect(0, 0, self.width, self.height, 3, fill=1, stroke=1)


def fmt_dur(sec):
    if not sec:
        return "0 sec"
    m, s = divmod(sec, 60)
    return f"{m} min {s} sec" if s and m else (f"{m} min" if m else f"{s} sec")


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


def _make_num_box(number):
    nc = Paragraph(
        str(number),
        ParagraphStyle(
            f'n_{uuid.uuid4().hex}',
            fontName='Helvetica-Bold',
            fontSize=14,
            textColor=colors.white,
            alignment=TA_CENTER,
        )
    )
    box = Table([[nc]], colWidths=[_NUM_BOX - 2*mm], rowHeights=[14*mm])
    box.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#1976d2')),
        ('BOX', (0, 0), (-1, -1), 0, colors.HexColor('#1976d2')),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    return box


def build_pdf(opl, steps, tags):
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=20*mm, rightMargin=20*mm,
        topMargin=15*mm, bottomMargin=15*mm,
    )
    story = []

    story.append(Paragraph(opl['title'], _styles['Title']))

    if opl.get('description'):
        d = clean_html(opl['description'])
        if d:
            story.append(Paragraph(d, _styles['Body']))

    if tags:
        story.append(Spacer(1, 4))
        for tg in tags:
            story.append(ColoredRect(30*mm, 8*mm, colors.HexColor(tg['color'])))
        story.append(Spacer(1, 6))

    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e0e0e0')))
    story.append(Spacer(1, 8))

    for st in steps:
        numbox = _make_num_box(st['step_number'])

        parts = []
        if st.get('title'):
            parts.append(Paragraph(st['title'], _styles['Subtitle']))
        txt = clean_html(st.get('description_html') or st.get('description') or '')
        if txt:
            parts.append(Paragraph(txt, _styles['Body']))
        parts.append(Paragraph(
            f"Duration: {fmt_dur(st.get('duration_sec', 0))}",
            _styles['Small']
        ))

        if parts:
            first = parts[0]
            story.append(Table(
                [[numbox, first]],
                colWidths=[_NUM_BOX, _DESC_BOX],
            ))
            for p in parts[1:]:
                story.append(Table(
                    [[Paragraph('', _styles['Normal']), p]],
                    colWidths=[_NUM_BOX, _DESC_BOX],
                ))
        else:
            story.append(Table(
                [[numbox, Paragraph('', _styles['Normal'])]],
                colWidths=[_NUM_BOX, _DESC_BOX],
            ))

        story.append(Spacer(1, 4))
        story.append(HRFlowable(width="90%", thickness=0.5, color=colors.HexColor('#eeeeee')))
        story.append(Spacer(1, 6))

    story.append(Spacer(1, 20))
    created = opl.get('created_at')
    if isinstance(created, str):
        created = datetime.fromisoformat(created.replace('Z', '+00:00'))
    story.append(Paragraph(
        f"Created: {created.strftime('%d.%m.%Y %H:%M')}",
        _styles['Footer']
    ))

    doc.build(story)
    buf.seek(0)
    return buf