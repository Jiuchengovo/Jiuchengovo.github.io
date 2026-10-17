"""Version local stylesheets by content so deployments cannot reuse stale CSS."""
from hashlib import sha256
from pathlib import Path
from urllib.parse import parse_qsl, unquote, urlencode, urlsplit, urlunsplit


def on_config(config):
    versioned = []
    for url in config.extra_css:
        parts = urlsplit(url)
        asset = Path(config.docs_dir) / unquote(parts.path)
        if not parts.scheme and not parts.netloc and asset.is_file():
            version = sha256(asset.read_bytes()).hexdigest()[:12]
            query = [(key, value) for key, value in parse_qsl(parts.query) if key != "v"]
            query.append(("v", version))
            url = urlunsplit(parts._replace(query=urlencode(query)))
        versioned.append(url)
    config.extra_css = versioned
    return config
