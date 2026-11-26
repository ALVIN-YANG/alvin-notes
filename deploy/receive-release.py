#!/usr/bin/env python3
"""Install a static blog release from the restricted deployment SSH key."""

import fcntl
import os
import re
import shutil
import sys
import tarfile
import tempfile
from pathlib import Path

SITE_ROOT = Path("/var/www/blog.mlxb.cc/site")
MAX_ARCHIVE_BYTES = 512 * 1024 * 1024
MAX_SITE_BYTES = 1024 * 1024 * 1024


def copy_archive(source, destination):
    remaining = MAX_ARCHIVE_BYTES
    while chunk := source.read(1024 * 1024):
        remaining -= len(chunk)
        if remaining < 0:
            raise ValueError("Archive exceeds the compressed size limit")
        destination.write(chunk)
    destination.seek(0)


def extract_site(archive, target):
    remaining = MAX_SITE_BYTES

    def static_files(member, path):
        nonlocal remaining
        if not (member.isfile() or member.isdir()):
            raise ValueError("Only regular files and directories are accepted")
        remaining -= member.size
        if remaining < 0:
            raise ValueError("Archive exceeds the expanded size limit")
        safe = tarfile.data_filter(member, path)
        return safe.replace(mode=0o755 if member.isdir() else 0o644)

    with tarfile.open(fileobj=archive, mode="r|gz") as bundle:
        bundle.extractall(target, filter=static_files)
    required = ("index.html", "404.html", "sitemap-index.xml", "pagefind/pagefind.js")
    if not all((target / file).is_file() and (target / file).stat().st_size for file in required):
        raise ValueError("Static site is incomplete")


def replace_link(link, target, staging):
    new_link = staging / link.name
    new_link.symlink_to(target)
    os.replace(new_link, link)


def install_release(revision, source, site=SITE_ROOT):
    releases = site / "releases"
    current = site / "current"
    previous = site / "previous"
    release = releases / revision

    with (site / "deploy.lock").open("w") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        with tempfile.TemporaryDirectory(prefix=".incoming-", dir=site) as temporary:
            staging = Path(temporary)
            candidate = staging / "site"
            candidate.mkdir()
            with tempfile.TemporaryFile(dir=staging) as archive:
                copy_archive(source, archive)
                extract_site(archive, candidate)

            if not release.exists():
                candidate.rename(release)
            old_target = os.readlink(current) if current.is_symlink() else None
            target = f"releases/{revision}"
            if old_target and old_target != target:
                replace_link(previous, old_target, staging)
            replace_link(current, target, staging)

            keep = {revision}
            if previous.is_symlink():
                keep.add(Path(os.readlink(previous)).name)
            for old_release in releases.iterdir():
                if re.fullmatch(r"[0-9a-f]{40}", old_release.name) and old_release.name not in keep:
                    shutil.rmtree(old_release)

    print(f"Deployed {revision}")


if __name__ == "__main__":
    command = os.environ.get("SSH_ORIGINAL_COMMAND", "")
    match = re.fullmatch(r"deploy ([0-9a-f]{40})", command)
    if not match:
        sys.exit("Expected a deploy command with a full Git revision")
    install_release(match[1], sys.stdin.buffer)
