#!/usr/bin/env python3
"""RAG tokenizer 演练：真实编码、截断、按句切块和生成输入预算。

Python >= 3.10。安装：pip install tiktoken==0.12.0 tokenizers==0.22.2
首次运行下载 tokenizer 文件和 tiktoken 词表；不下载模型权重、不调用模型 API。
示例中的生成预算是教学配置；o200k_base 只计算纯文本，不计算聊天模板。
"""

import argparse
import hashlib
import importlib.metadata
import json
from pathlib import Path
import platform
import re
import urllib.request

import tiktoken
from tokenizers import Tokenizer

MODEL = "BAAI/bge-small-zh-v1.5"
REVISION = "7999e1d3359715c523056ef9478215996d62a620"
TEXT = "员工出差住宿，每晚最多报销 500 元。"
FILE_HASHES = {
    "tokenizer.json": "48cea5d44424912a6fd1ea647bf4fe50b55ab8b1e5879c3275f80e339e8fae26",
    "config.json": "3853a7979202c348751b753e36f579c41d8da7d36af617d3d907e1fc9b441f2a",
}


def load_tokenizer(cache):
    cache.mkdir(parents=True, exist_ok=True)
    paths = {}
    for name in ("tokenizer.json", "config.json"):
        path = cache / name
        if not path.exists():
            url = f"https://huggingface.co/{MODEL}/resolve/{REVISION}/{name}"
            with urllib.request.urlopen(url, timeout=30) as response:
                content = response.read()
            # 解析通过后才写缓存，避免把错误响应当成 tokenizer。
            json.loads(content)
            temporary = path.with_suffix(".download")
            temporary.write_bytes(content)
            temporary.replace(path)
        if hashlib.sha256(path.read_bytes()).hexdigest() != FILE_HASHES[name]:
            raise ValueError(f"{path} 与固定修订不一致，请删除该缓存文件后重试。")
        paths[name] = path
    tok = Tokenizer.from_file(str(paths["tokenizer.json"]))
    tok.no_truncation()
    tok.no_padding()
    config = json.loads(paths["config.json"].read_text())
    return tok, config, paths


def split_sentences(text, tok, max_tokens):
    """按句子边界分块；整段编码，含特殊 token，超长单句明确报错。"""
    sentences = re.findall(r"[^。！？]+[。！？]?", text)
    chunks, current = [], ""
    for sentence in sentences:
        if len(tok.encode(sentence).ids) > max_tokens:
            raise ValueError("单句超限，需按条款或子句继续拆分，不能直接截断。")
        candidate = current + sentence
        if current and len(tok.encode(candidate).ids) > max_tokens:
            chunks.append(current)
            current = sentence
        else:
            current = candidate
    if current:
        chunks.append(current)
    return chunks


def build_prompt(question, passages):
    context = "\n\n".join(passages)
    return f"根据资料回答，注明来源；资料不足时说明缺口。\n资料：\n{context}\n问题：{question}"


def pack_passages(question, passages, enc, window, output_reserve, margin):
    """按已有相关性顺序装入完整片段；每次重新编码整个最终文本。"""
    if min(window, output_reserve, margin) < 0:
        raise ValueError("预算不能为负数。")
    input_limit = window - output_reserve - margin
    if len(enc.encode(build_prompt(question, []))) > input_limit:
        raise ValueError("问题与固定要求已经超限，请先缩短它们或更换配置。")
    selected, skipped = [], []
    for passage in passages:
        candidate = build_prompt(question, selected + [passage])
        if len(enc.encode(candidate)) <= input_limit:
            selected.append(passage)
        else:
            skipped.append(passage)
    return selected, skipped, len(enc.encode(build_prompt(question, selected)))


def demonstrate(cache, self_test=False):
    tok, config, paths = load_tokenizer(cache)
    enc = tiktoken.get_encoding("o200k_base")
    plain = tok.encode(TEXT, add_special_tokens=False)
    full = tok.encode(TEXT, add_special_tokens=True)
    llm_ids = enc.encode(TEXT)
    long_text = "这是背景资料。" * 90 + "关键规定：住宿每晚最多报销500元。"
    long_full = tok.encode(long_text)
    tok.enable_truncation(max_length=config["max_position_embeddings"])
    truncated = tok.encode(long_text)
    visible_end = max(end for start, end in truncated.offsets)
    tok.no_truncation()
    chunks = split_sentences(long_text, tok, max_tokens=128)
    question = "出差住酒店，每晚最多能报销多少？"
    passages = [
        "[S1] 差旅制度第8条：员工出差住宿，每晚最多报销500元。",
        "[S2] 办理流程：" + "提交发票并由负责人审核。" * 16,
        "[S3] 差旅制度第9条：住宿超出上限的部分由个人承担。",
    ]
    selected, skipped, input_tokens = pack_passages(
        question, passages, enc, window=256, output_reserve=64, margin=16
    )
    if self_test:
        assert enc.decode(llm_ids) == TEXT
        assert len(full.ids) == len(plain.ids) + 2
        assert long_full.ids[-1] == truncated.ids[-1] == 102  # [SEP] 仍存在
        assert len(long_full.ids) > len(truncated.ids) == 512
        assert "500" not in long_text[:visible_end]
        assert "".join(chunks) == long_text
        assert all(len(tok.encode(chunk).ids) <= 128 for chunk in chunks)
        assert any("500" in chunk for chunk in chunks)
        assert input_tokens + 64 + 16 <= 256
        assert passages[0] in selected and passages[1] in skipped
        try:
            split_sentences("住宿" * 100, tok, max_tokens=16)
        except ValueError:
            pass
        else:
            raise AssertionError("超长单句必须显式拒绝。")
    return {
        "text": TEXT,
        "characters": len(TEXT),
        "versions": {
            "python": platform.python_version(),
            "tokenizers": importlib.metadata.version("tokenizers"),
            "tiktoken": importlib.metadata.version("tiktoken"),
            "model": MODEL,
            "revision": REVISION,
            "tokenizerSha256": hashlib.sha256(paths["tokenizer.json"].read_bytes()).hexdigest(),
        },
        "embedding": {
            "contentTokens": len(plain.ids),
            "totalTokens": len(full.ids),
            "tokens": full.tokens,
            "ids": full.ids,
            "specialMask": full.special_tokens_mask,
            "modelInputLimit": config["max_position_embeddings"],
            "vectorDimension": config["hidden_size"],
        },
        "generation": {
            "encoding": "o200k_base",
            "totalTokens": len(llm_ids),
            "tokens": [enc.decode_single_token_bytes(i).decode("utf-8", errors="backslashreplace") for i in llm_ids],
            "ids": llm_ids,
        },
        "truncation": {
            "fullTokens": len(long_full.ids),
            "sentTokens": len(truncated.ids),
            "lostRule": "500" not in long_text[:visible_end],
            "visibleTail": long_text[:visible_end][-35:],
            "chunkLimit": 128,
            "chunkTokenCounts": [len(tok.encode(chunk).ids) for chunk in chunks],
            "rulePreserved": any("500" in chunk for chunk in chunks),
        },
        "packing": {
            "window": 256, "outputReserve": 64, "margin": 16,
            "inputTokens": input_tokens,
            "selectedSources": [p.split("]")[0] + "]" for p in selected],
            "skippedSources": [p.split("]")[0] + "]" for p in skipped],
        },
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cache-dir", type=Path, default=Path.home() / ".cache" / "rag-tokenizer-demo" / REVISION)
    parser.add_argument("--self-test", action="store_true", help="同时检查截断、分块和预算边界")
    args = parser.parse_args()
    print(json.dumps(demonstrate(args.cache_dir, args.self_test), ensure_ascii=False, indent=2))
