import bleach
import markdown as md_lib

ALLOWED_TAGS = [
    "p", "br",
    "strong", "em", "b", "i",
    "ul", "ol", "li",
    "pre", "code",
    "blockquote",
    "a",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "hr",
    "table", "thead", "tbody", "tr", "th", "td",
]

ALLOWED_ATTRIBUTES = {
    "a": ["href", "title", "target", "rel"],
}


def render_markdown(text: str | None) -> str | None:
    if not text:
        return text

    html = md_lib.markdown(
        text,
        extensions=["fenced_code", "codehilite", "tables", "attr_list"],
    )

    cleaned = bleach.clean(
        html,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        strip=True,
    )

    return cleaned
