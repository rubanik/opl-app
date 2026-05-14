import bleach
import markdown as md_lib

ALLOWED_TAGS = [
    "p", "br",
    "strong", "em", "b", "i",
    "ul", "ol", "li",
    "pre", "code",
    "blockquote",
]


def render_markdown(text: str | None) -> str | None:
    if not text:
        return text

    html = md_lib.markdown(
        text,
        extensions=["fenced_code", "codehilite"],
    )

    cleaned = bleach.clean(
        html,
        tags=ALLOWED_TAGS,
        attributes={},
        strip=True,
    )

    return cleaned
