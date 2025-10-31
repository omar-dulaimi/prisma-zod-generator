# Docs Site

Docusaurus v3 site for Prisma Zod Generator. Local dev:

```bash
npm install
npm run docs:dev
```

Build:

```bash
npm run docs:build
```

## Brand assets

Favicon and PWA icons live in `static/img/brand`. Regenerate them with the
Python helper located at `../src/pro/scripts/branding/generate_brand_assets.py`:

```bash
cd ..
python3.12 -m venv src/pro/scripts/branding/.venv
source src/pro/scripts/branding/.venv/bin/activate
pip install -r src/pro/scripts/branding/requirements.txt
python src/pro/scripts/branding/generate_brand_assets.py --skip-previews --export-icons website/static/img/brand
```

Commit the updated PNGs, `favicon.ico`, and `icon-manifest.json` alongside any
docs changes.
