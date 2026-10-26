"""Check the exact published teaching code against independent reference models."""
import random
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / 'src/data/system-design-supplements'


def load(name):
    text = (ROOT / (name + '.md')).read_text()
    blocks = re.findall(r'```python\n(.*?)\n```', text, re.S)
    assert len(blocks) == 1, 'Review changed code blocks: ' + name
    namespace = {}
    exec(compile(blocks[0], name, 'exec'), namespace)
    return namespace


class SupplementChecks(unittest.TestCase):
    def test_mapreduce_split_independence(self):
        model = load('mapreduce')['map_reduce_sales']
        rng = random.Random(47)
        rows = [(rng.choice(['杭州', '上海', '北京']), rng.randrange(-100, 1000)) for _ in range(1000)]
        expected = {city: sum(value for key, value in rows if key == city) for city in ['杭州', '上海', '北京']}
        for width in [1, 7, 53, 1000]:
            self.assertEqual(model([rows[i:i + width] for i in range(0, len(rows), width)]), expected)
        self.assertEqual(model([[], []]), {})
        self.assertNotEqual(((10 + 20) / 2 + 90) / 2, (10 + 20 + 90) / 3)

    def test_hash_ring_add_remove_and_boundary(self):
        owner = load('consistent-hashing')['owner']
        old = {10: 'A', 40: 'B', 80: 'C'}
        with self.assertRaises(ValueError):
            owner(5, {})
        self.assertEqual(owner(10, old), 'A')
        self.assertEqual(owner(99, old), 'A')
        for token in [0, 5, 25, 60, 99]:
            new = {**old, token: 'D'}
            for key in range(100):
                actual = owner(key, new)
                # On adding D, a key either stays where it was or moves to D.
                self.assertIn(actual, [owner(key, old), 'D'])
                # Removing D returns exactly to the original mapping.
                self.assertEqual(owner(key, {k: v for k, v in new.items() if v != 'D'}), owner(key, old))

    def test_gather_deadline_failure_and_duplicate(self):
        g = load('scatter-gather')['gather']
        rows = [('A', 10, [('a', 5)]), ('A', 20, [('duplicate', 100)]), ('B', 80, []), ('C', 81, [('c', 99)])]
        result = g(rows, ['A', 'B', 'C'], 80, 2, require_all=False)
        self.assertEqual(result['items'], [('a', 5)])
        self.assertEqual(result['responded_shards'], ['A', 'B'])
        self.assertEqual(result['missing_shards'], ['C'])
        self.assertFalse(result['complete'])
        with self.assertRaises(RuntimeError):
            g(rows, ['A', 'B', 'C'], 80, 2)
        failed = g([('A', 1, None), ('A', 2, [('retry', 5)])], ['A'], 10, 1, require_all=False)
        self.assertEqual(failed['failed_shards'], ['A'])
        self.assertFalse(failed['complete'])
        for expected, deadline, k in [([], 5, 1), (['A'], -1, 1), (['A'], 5, 0)]:
            with self.assertRaises(ValueError):
                g([], expected, deadline, k)

    def test_local_top_k_suffices_under_stated_assumptions(self):
        g = load('scatter-gather')['gather']
        rng = random.Random(48)
        for k in [1, 2, 7]:
            shards = [[(f'{s}-{i}', rng.randrange(20)) for i in range(25)] for s in range(4)]
            rank = lambda item: (-item[1], item[0])
            expected = sorted([item for shard in shards for item in shard], key=rank)[:k]
            replies = [(str(i), 1, sorted(shard, key=rank)[:k]) for i, shard in enumerate(shards)]
            self.assertEqual(g(replies, map(str, range(4)), 2, k)['items'], expected)
        self.assertAlmostEqual(1 - .99 ** 100, .634, places=3)


if __name__ == '__main__':
    unittest.main()
