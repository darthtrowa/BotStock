import os
import sys
from pathlib import Path


def user_home_dir() -> str:
    postfix = ""

    if sys.platform == "win32":
        postfix = "\\AppData"

    home = os.getenv("HOMEDRIVE", default="") + os.getenv("HOMEPATH", default="")

    if home == "":
        home = os.getenv("USERPROFILE", default="")

    if home == "":
        home = os.getenv("HOME", default="")

    return home + postfix


DIRECTORY = Path(user_home_dir())
CONFIG_PATH = DIRECTORY / "settradesdkv2_config.txt"

DEFAULT_CONFIG = {
    "environment": "prod",
    "clear_log": 30,
    "params": "",
}

try:
    with open(CONFIG_PATH, "r") as f:
        config = f.read().strip()
        config = config.split("\n")
        config = {k.strip(): v.strip() for k, v in (line.split("=") for line in config)}
        config = {**DEFAULT_CONFIG, **config}

        for k, v in config.items():
            if k == "environment":
                config[k] = v.lower()
            elif k == "clear_log":
                config[k] = int(v)
except FileNotFoundError:
    config = DEFAULT_CONFIG.copy()

with open(CONFIG_PATH, "w") as f:
    f.write("\n".join(f"{k}={v}" for k, v in config.items()))
