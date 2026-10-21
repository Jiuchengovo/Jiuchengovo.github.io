"""Version local CSS and JavaScript by content to avoid mixed deployments."""
from hashlib import sha256
from pathlib import Path
from urllib.parse import parse_qsl, unquote, urlencode, urlsplit, urlunsplit


def version_url(url, docs_dir):
    parts = urlsplit(url)
    asset = Path(docs_dir) / unquote(parts.path)
    if not parts.scheme and not parts.netloc and asset.is_file():
        version = sha256(asset.read_bytes()).hexdigest()[:12]
        query = [(key, value) for key, value in parse_qsl(parts.query) if key != "v"]
        query.append(("v", version))
        url = urlunsplit(parts._replace(query=urlencode(query)))
    return url


def on_config(config):
    config.extra_css = [version_url(url, config.docs_dir) for url in config.extra_css]
    scripts = []
    for script in config.extra_javascript:
        if isinstance(script, str):
            script = version_url(script, config.docs_dir)
        else:
            script.path = version_url(script.path, config.docs_dir)
        scripts.append(script)
    config.extra_javascript = scripts
    config.extra["giscus_light_theme"] = version_url("theme/css/giscus-light.css", config.docs_dir)
    return config
