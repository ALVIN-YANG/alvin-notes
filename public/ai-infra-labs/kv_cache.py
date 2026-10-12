"""KV size calculation and a tiny reference-counted block pool. No GPU required."""
import json
from dataclasses import dataclass, field


def kv_bytes(layers, kv_heads, head_dim, tokens, element_bytes, requests=1):
    values = (layers, kv_heads, head_dim, tokens, element_bytes, requests)
    if any(not isinstance(value, int) or value <= 0 for value in values):
        raise ValueError("All size arguments must be positive integers")
    return 2 * layers * kv_heads * head_dim * tokens * element_bytes * requests


class Pool:
    def __init__(self, block_size=4):
        if block_size <= 0:
            raise ValueError("block_size must be positive")
        self.block_size, self.next_id = block_size, 0
        self.data, self.refs = {}, {}

    def allocate(self, content=()):
        block = self.next_id
        self.next_id += 1
        self.data[block], self.refs[block] = list(content), 1
        return block

    def retain(self, block):
        self.refs[block] += 1

    def release(self, block):
        self.refs[block] -= 1
        if self.refs[block] == 0:
            del self.refs[block]
            del self.data[block]


@dataclass
class Sequence:
    pool: Pool
    blocks: list = field(default_factory=list)
    length: int = 0

    def append(self, token):
        offset = self.length % self.pool.block_size
        if offset == 0:
            self.blocks.append(self.pool.allocate())
        elif self.pool.refs[self.blocks[-1]] > 1:
            old = self.blocks[-1]
            self.blocks[-1] = self.pool.allocate(self.pool.data[old])
            self.pool.release(old)  # Copy-on-write for a shared partial tail.
        self.pool.data[self.blocks[-1]].append(token)
        self.length += 1

    def fork(self):
        for block in self.blocks:
            self.pool.retain(block)
        return Sequence(self.pool, self.blocks.copy(), self.length)

    def tokens(self):
        return [token for block in self.blocks for token in self.pool.data[block]]

    def close(self):
        for block in self.blocks:
            self.pool.release(block)
        self.blocks, self.length = [], 0


def main():
    sizes = {name: kv_bytes(32, heads, 128, 4096, 2) // (1024 ** 2)
             for name, heads in [("MHA_32", 32), ("GQA_8", 8), ("MQA_1", 1)]}
    assert sizes == {"MHA_32": 2048, "GQA_8": 512, "MQA_1": 64}
    pool, snapshots = Pool(4), []
    a = Sequence(pool)
    for token in range(6):
        a.append(token)
    b = a.fork()
    snapshots.append({"step": "fork", "a": a.blocks.copy(), "b": b.blocks.copy(),
                      "physical_blocks": len(pool.data), "refs": pool.refs.copy()})
    b.append(6)
    assert a.tokens() == list(range(6)) and b.tokens() == list(range(7))
    assert len(pool.data) == 3
    snapshots.append({"step": "append B", "a": a.blocks.copy(), "b": b.blocks.copy(),
                      "physical_blocks": len(pool.data), "refs": pool.refs.copy()})
    a.close()
    assert len(pool.data) == 2
    b.close()
    assert not pool.data and not pool.refs
    print(json.dumps({"kind": "logical size and toy block allocator",
                      "single_request_MiB": sizes,
                      "eight_GQA_requests_GiB": kv_bytes(32, 8, 128, 4096, 2, 8) / 1024 ** 3,
                      "snapshots": snapshots, "blocks_after_release": len(pool.data)}, indent=2))


if __name__ == "__main__":
    main()
