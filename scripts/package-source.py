"""Create an immutable source handoff, including verified local evidence."""
from pathlib import Path
import json
import zipfile

root = Path(__file__).resolve().parent.parent
destination = root / "dist" / "ImageScanner-1.0.0-kaynak.zip"
if destination.exists():
    raise FileExistsError(f"Mevcut kaynak arsivi korunuyor: {destination}")

files = [root / name for name in (
    "package.json", "package-lock.json", ".gitignore", "README.md", "DOGRULAMA.md", "LICENSE", "BASLAT.cmd"
)]
for directory in ("src", "assets", "scripts", "tests"):
    files += sorted(p for p in (root / directory).rglob("*") if p.is_file() and not p.is_symlink())
for name in ("verification.json", "packaged-verification.json", "portable-boot-verification.json"):
    source = root / "artifacts" / name
    assert json.loads(source.read_text(encoding="utf-8-sig"))["passed"] is True
    files.append(source)
for name in ("packaged-results.png", "packaged-compare.png", "packaged-library.png", "packaged-settings.png"):
    files.append(root / "artifacts" / name)

prefix = "ImageScanner-1.0.0"
with zipfile.ZipFile(destination, "x", zipfile.ZIP_DEFLATED, compresslevel=7) as archive:
    for source in files:
        assert source.is_file(), source
        archive.write(source, f"{prefix}/{source.relative_to(root).as_posix()}")
with zipfile.ZipFile(destination) as archive:
    assert archive.testzip() is None
    names = set(archive.namelist())
    assert f"{prefix}/src/main.cjs" in names
    assert f"{prefix}/tests/electron-smoke.cjs" in names
    assert all("/node_modules/" not in name and "/.test-data/" not in name for name in names)
    print(f"Kaynak ZIP dogrulandi: {len(names)} dosya, {destination.stat().st_size} bayt.")
    print(destination)
