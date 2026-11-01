"""Evaluate small embedding models for English concept queries over the bundled VRI Pali
(title + opening text of every citable unit). Measurement tool for issue #33; nothing it
produces is shipped. See docs/semantic-search.md for the results and the decision.

Usage (models downloaded by hand from Hugging Face into <models>/<org>/<name>/):
  python -I scripts/semantic/eval_embeddings.py <models dir> [potion] [minilm] [multi]
Files needed (each under 200 MB):
  potion  minishlab/potion-base-8M/                              model.safetensors, tokenizer.json
  minilm  sentence-transformers/all-MiniLM-L6-v2/                model.safetensors, tokenizer.json
  multi   sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2/  onnx/model_qint8_avx512.onnx, tokenizer.json
Needs numpy, tokenizers, safetensors; torch + transformers for minilm; onnxruntime for multi.
Each text is embedded as (title + '. ' + text)[:600], so the title counts toward the 600.
"""
import gzip, json, re, sys, time, os
import numpy as np
from tokenizers import Tokenizer

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
S = None  # models folder, set from argv in main()
SKIP = {'title', 'chapter', 'nikaya', 'book', 'subhead'}

def load_units():
    c = json.load(gzip.open(os.path.join(ROOT, 'server', 'data', 'canon.json.gz'), 'rt', encoding='utf-8'))
    out = []
    for u in c['units']:
        blocks = c['books'][u['book']]['blocks'][u['start']:u['end']]
        text = ' '.join(b[2] for b in blocks if b[0] not in SKIP)
        text = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', text))
        out.append({'id': u['id'], 'title': u['title'], 'text': text[:1200]})
    return out

def relevance(q):
    pat = re.compile(q['title'], re.I) if q.get('title') else None
    ids, prefix = set(q.get('ids', [])), q.get('prefix')
    return lambda i, t: i in ids or (prefix and i.startswith(prefix)) or (pat and pat.search(t))

def load_queries():
    with open(os.path.join(ROOT, 'scripts', 'semantic', 'queries.json'), encoding='utf-8') as f:
        return [(q['query'], relevance(q)) for q in json.load(f)['queries']]

units, Q = [], []

def doc(u): return (u['title'] + '. ' + u['text'])[:600]

def l2(x): return x / np.maximum(np.linalg.norm(x, axis=1, keepdims=True), 1e-9)

def mean_pool(h, mask):
    m = mask[..., None].astype(np.float32)
    return (h * m).sum(1) / np.maximum(m.sum(1), 1e-9)

def batch_encode(tok, texts, maxlen):
    tok.enable_truncation(maxlen); tok.enable_padding()
    e = tok.encode_batch(texts)
    return (np.array([x.ids for x in e], dtype=np.int64), np.array([x.attention_mask for x in e], dtype=np.int64))

def potion(name):
    from safetensors.numpy import load_file
    d = os.path.join(S, name)
    W = load_file(os.path.join(d, 'model.safetensors'))['embeddings']
    tok = Tokenizer.from_file(os.path.join(d, 'tokenizer.json'))
    def enc(texts):
        out = []
        for t in texts:
            ids = [i for i in tok.encode(t, add_special_tokens=False).ids][:512]
            out.append(W[ids].mean(0) if ids else np.zeros(W.shape[1], np.float32))
        return l2(np.array(out, np.float32))
    return enc, W.shape

def minilm_torch(name):
    import torch
    from transformers import BertConfig, BertModel
    from safetensors.torch import load_file
    d = os.path.join(S, name)
    cfg = BertConfig(vocab_size=30522, hidden_size=384, num_hidden_layers=6, num_attention_heads=12, intermediate_size=1536)
    m = BertModel(cfg); sd = load_file(os.path.join(d, 'model.safetensors'))
    sd = {k.replace('bert.', ''): v for k, v in sd.items()}
    print(' missing', m.load_state_dict(sd, strict=False).missing_keys[:3]); m.eval()
    tok = Tokenizer.from_file(os.path.join(d, 'tokenizer.json'))
    def enc(texts):
        res = []
        for i in range(0, len(texts), 128):
            ids, mask = batch_encode(tok, texts[i:i+128], 256)
            with torch.no_grad():
                h = m(input_ids=torch.tensor(ids), attention_mask=torch.tensor(mask)).last_hidden_state.numpy()
            res.append(mean_pool(h, mask))
        return l2(np.concatenate(res))
    return enc, None

def onnx_model(name, f):
    import onnxruntime as ort
    d = os.path.join(S, name)
    sess = ort.InferenceSession(os.path.join(d, 'onnx', f), providers=['CPUExecutionProvider'])
    tok = Tokenizer.from_file(os.path.join(d, 'tokenizer.json'))
    names = [i.name for i in sess.get_inputs()]
    def enc(texts):
        res = []
        for i in range(0, len(texts), 64):
            ids, mask = batch_encode(tok, texts[i:i+64], 128)
            feed = {'input_ids': ids, 'attention_mask': mask}
            if 'token_type_ids' in names: feed['token_type_ids'] = np.zeros_like(ids)
            res.append(mean_pool(sess.run(None, feed)[0], mask))
        return l2(np.concatenate(res))
    return enc, None

def evaluate(label, enc):
    t0 = time.time(); D = enc([doc(u) for u in units]); t = time.time() - t0
    rows, hits, mrr = [], 0, 0.0
    for q, rel in Q:
        qv = enc([q])[0]; order = np.argsort(-(D @ qv))[:10]
        rank = next((r + 1 for r, k in enumerate(order) if rel(units[k]['id'], units[k]['title'])), None)
        hits += rank is not None; mrr += 1 / rank if rank else 0
        base = sum(1 for u in units if rel(u['id'], u['title'])) / len(units)
        rows.append((q, rank, round(1 - (1 - base) ** 10, 3), [units[k]['id'] for k in order[:3]]))
    n = len(Q)
    print(f'\n## {label}: hit@10 {hits}/{n}, MRR@10 {mrr/n:.2f}, encode {len(units)} docs {t:.0f}s, dims {D.shape[1]}')
    for q, r, rnd, top in rows: print(f'  {q!r:55} rank={r} random@10={rnd} top3={top}')

def main():
    global S, units, Q
    sys.stdout.reconfigure(encoding='utf-8')
    if len(sys.argv) < 2: sys.exit(__doc__)
    S = sys.argv[1]
    units, Q = load_units(), load_queries()
    which = sys.argv[2:] or ['potion', 'minilm', 'multi']
    if 'potion' in which: evaluate('potion-base-8M (static, MIT)', potion('minishlab/potion-base-8M')[0])
    if 'minilm' in which: evaluate('all-MiniLM-L6-v2 (Apache-2.0)', minilm_torch('sentence-transformers/all-MiniLM-L6-v2')[0])
    if 'multi' in which: evaluate('paraphrase-multilingual-MiniLM-L12-v2 qint8 (Apache-2.0)', onnx_model('sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2', 'model_qint8_avx512.onnx')[0])

if __name__ == '__main__':
    main()
