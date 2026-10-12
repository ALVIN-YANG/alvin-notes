"""Tiny causal decoder: CPU reference, not a trained language model or benchmark."""
import json
import math
import random
from dataclasses import dataclass


def matvec(x, weight):
    return [sum(a * b for a, b in zip(x, column)) for column in zip(*weight)]


def add(a, b):
    return [x + y for x, y in zip(a, b)]


def rmsnorm(x):
    scale = math.sqrt(sum(v * v for v in x) / len(x) + 1e-6)
    return [v / scale for v in x]


def softmax(x):
    shifted = [math.exp(v - max(x)) for v in x]
    return [v / sum(shifted) for v in shifted]


@dataclass
class Work:
    projected_rows: int = 0
    score_pairs: int = 0


class Decoder:
    def __init__(self, seed=7):
        self.width, self.q_heads, self.kv_heads = 8, 2, 1
        self.head_dim, self.layers, self.vocab = 4, 2, 6
        rng = random.Random(seed)

        def weights(rows, columns):
            return [[rng.uniform(-0.2, 0.2) for _ in range(columns)]
                    for _ in range(rows)]

        self.embedding = weights(self.vocab, self.width)
        self.position = weights(64, self.width)
        self.blocks = [{
            "q": weights(8, 8), "k": weights(8, 4), "v": weights(8, 4),
            "out": weights(8, 8), "gate": weights(8, 16),
            "up": weights(8, 16), "down": weights(16, 8),
        } for _ in range(self.layers)]
        self.lm_head = weights(self.width, self.vocab)

    def empty_cache(self):
        return [{"k": [], "v": []} for _ in range(self.layers)]

    def forward(self, tokens, cache=None, work=None):
        if not tokens:
            raise ValueError("At least one new token is required")
        work = work if work is not None else Work()
        state = self.empty_cache() if cache is None else cache
        past = len(state[0]["k"])
        if any(len(layer["k"]) != past or len(layer["v"]) != past
               for layer in state):
            raise ValueError("All layers must contain the same past length")
        if past + len(tokens) > len(self.position):
            raise ValueError("Toy context limit is 64 tokens")
        x = [add(self.embedding[token], self.position[past + i])
             for i, token in enumerate(tokens)]

        for layer, block in zip(state, self.blocks):
            norm = [rmsnorm(row) for row in x]
            q = [matvec(row, block["q"]) for row in norm]
            new_k = [matvec(row, block["k"]) for row in norm]
            new_v = [matvec(row, block["v"]) for row in norm]
            keys, values = layer["k"] + new_k, layer["v"] + new_v
            work.projected_rows += len(tokens)
            attended = []
            for i, query in enumerate(q):
                visible = past + i + 1  # Never attend to future new tokens.
                heads = []
                for head in range(self.q_heads):
                    kv_head = head // (self.q_heads // self.kv_heads)
                    qs = query[head * 4:(head + 1) * 4]
                    ks = [row[kv_head * 4:(kv_head + 1) * 4]
                          for row in keys[:visible]]
                    vs = [row[kv_head * 4:(kv_head + 1) * 4]
                          for row in values[:visible]]
                    scores = [sum(a * b for a, b in zip(qs, key)) / 2
                              for key in ks]  # sqrt(head_dim) = 2
                    probabilities = softmax(scores)
                    heads.extend(sum(p * row[j] for p, row in zip(probabilities, vs))
                                 for j in range(self.head_dim))
                    work.score_pairs += visible
                attended.append(matvec(heads, block["out"]))
            x = [add(row, attention) for row, attention in zip(x, attended)]
            next_x = []
            for row in x:
                normalized = rmsnorm(row)
                gate = matvec(normalized, block["gate"])
                up = matvec(normalized, block["up"])
                hidden = [(g / (1 + math.exp(-g))) * u for g, u in zip(gate, up)]
                next_x.append(add(row, matvec(hidden, block["down"])))
            x = next_x
            if cache is not None:
                layer["k"], layer["v"] = keys, values
        return [matvec(rmsnorm(row), self.lm_head) for row in x]


def generate(model, prompt, count, cached):
    tokens, events, work = list(prompt), [], Work()
    cache = model.empty_cache() if cached else None
    for step in range(count):
        new = tokens if not cached or step == 0 else tokens[-1:]
        logits = model.forward(new, cache=cache, work=work)[-1]
        if cached:
            reference = model.forward(tokens)[-1]
            assert max(abs(a - b) for a, b in zip(logits, reference)) < 1e-12
        token = max(range(model.vocab), key=logits.__getitem__)
        events.append({"step": step + 1, "phase": "prefill" if step == 0 else "decode",
                       "input_rows": len(new), "context_tokens": len(tokens),
                       "next_token": token})
        tokens.append(token)
    return {"tokens": tokens, "projected_rows": work.projected_rows,
            "score_pairs": work.score_pairs, "events": events}


def main():
    model = Decoder()
    prompt = [0, 1, 2, 3]
    full = generate(model, prompt, 4, cached=False)
    cached = generate(model, prompt, 4, cached=True)
    assert full["tokens"] == cached["tokens"]
    assert (full["projected_rows"], cached["projected_rows"]) == (44, 14)
    print(json.dumps({"kind": "deterministic CPU reference; counts are not FLOPs",
                      "full_context": full, "with_cache": cached}, indent=2))


if __name__ == "__main__":
    main()
