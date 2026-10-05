import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "data" / "catalogo.json"

REQUIRED = ("id", "titulo", "categoria", "capa")

def main():
    data = json.loads(CATALOG.read_text(encoding="utf-8"))
    games = data.get("jogos")
    if not isinstance(games, list) or not games:
        raise SystemExit("ERRO: catalogo.json não contém uma lista de jogos.")

    ids = set()
    errors = []
    warnings = []

    for pos, game in enumerate(games, 1):
        for field in REQUIRED:
            if not game.get(field):
                errors.append(f"#{pos} id={game.get('id')}: campo obrigatório ausente: {field}")

        gid = str(game.get("id", "")).strip()
        if gid in ids:
            errors.append(f"#{pos} id duplicado: {gid}")
        ids.add(gid)

        title = str(game.get("titulo", "")).strip()
        if re.search(r"\bEdition Edition\b", title, re.I):
            warnings.append(f"id={gid}: título possivelmente duplicado: {title}")

        cover = str(game.get("capa", "")).strip()
        if cover:
            cover_path = ROOT / cover
            if not cover_path.exists():
                # Covers may be extracted during the Pages build, so missing files are warnings locally
                # when this script is run before extraction.
                warnings.append(f"id={gid}: capa não encontrada no workspace atual: {cover}")

        if not str(game.get("codigo", "")).strip():
            warnings.append(f"id={gid}: código CUSA ausente")
        if not str(game.get("versao", "")).strip():
            warnings.append(f"id={gid}: versão ausente")

    if errors:
        print("\n".join(errors))
        raise SystemExit(f"Validação falhou com {len(errors)} erro(s).")

    print(f"Catálogo válido: {len(games)} jogos, {len(ids)} IDs únicos.")
    if warnings:
        print(f"Avisos: {len(warnings)}")
        for warning in warnings[:25]:
            print(" - " + warning)
        if len(warnings) > 25:
            print(f" - ... e mais {len(warnings) - 25} aviso(s).")

if __name__ == "__main__":
    main()
