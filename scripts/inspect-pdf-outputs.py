import sys, json
from pathlib import Path
sys.path.insert(0,str(Path('artifacts/python').resolve()))
import fitz
report={}
for path in Path('artifacts/outputs').glob('*.pdf'):
    doc=fitz.open(path)
    pages=[]
    for i,page in enumerate(doc):
        pages.append({'width_pt':page.rect.width,'height_pt':page.rect.height,'text_characters':len(page.get_text())})
        if i==0:
            page.get_pixmap(matrix=fitz.Matrix(1,1)).save(str(path.with_suffix('.render.png')))
    report[path.name]={'pages':len(doc),'geometry':pages,'bytes':path.stat().st_size}
Path('artifacts/outputs/pdf-inspection.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
