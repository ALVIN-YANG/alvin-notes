"""Verify the mathematical and lifecycle claims used by the AI Infra lessons."""
import math
from pathlib import Path
import sys
import unittest

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'public' / 'ai-infra-labs'))
from decoder import Decoder, generate, softmax
from kv_cache import Pool, Sequence, kv_bytes
from scheduler import simulate
from metrics import report, percentile, linear_roofline


class DecoderTests(unittest.TestCase):
    def test_cache_preserves_logits_and_generated_tokens(self):
        for seed in [1, 7, 19]:
            for prompt in [[0], [0, 1, 2, 3], [2, 2, 2, 2, 2, 2, 2]]:
                model = Decoder(seed)
                full = generate(model, prompt, 5, False)
                cached = generate(model, prompt, 5, True)
                self.assertEqual(full['tokens'], cached['tokens'])
                self.assertLess(cached['projected_rows'], full['projected_rows'])

    def test_future_tokens_do_not_change_prefix_logits(self):
        model = Decoder()
        prefix = model.forward([0, 1, 2])
        extended = model.forward([0, 1, 2, 5, 4])[:3]
        for a, b in zip(prefix, extended):
            self.assertLess(max(abs(x - y) for x, y in zip(a, b)), 1e-12)

    def test_attention_hand_calculation(self):
        p = softmax([1 / math.sqrt(2), 0])
        self.assertEqual((round(10 * p[0], 5), round(20 * p[1], 5)), (6.69762, 6.60477))


class CacheTests(unittest.TestCase):
    def test_capacity_and_output_growth(self):
        self.assertEqual(kv_bytes(32, 8, 128, 4096, 2), 512 * 1024 ** 2)
        self.assertEqual(kv_bytes(32, 8, 128, 4224, 2), 528 * 1024 ** 2)
        self.assertEqual((8 * 1024 ** 3) // kv_bytes(32, 8, 128, 4224, 2), 15)

    def test_partial_tail_is_copied_and_all_references_released(self):
        pool = Pool(4)
        a = Sequence(pool)
        for token in range(6):
            a.append(token)
        b = a.fork()
        b.append(99)
        self.assertEqual(a.tokens(), list(range(6)))
        self.assertEqual(b.tokens(), list(range(6)) + [99])
        self.assertEqual(a.blocks[0], b.blocks[0])
        self.assertNotEqual(a.blocks[1], b.blocks[1])
        a.close()
        self.assertEqual(b.tokens(), list(range(6)) + [99])
        b.close()
        self.assertEqual(pool.refs, {})
        self.assertEqual(pool.data, {})

    def test_full_shared_block_needs_no_copy_on_next_append(self):
        pool = Pool(4)
        a = Sequence(pool)
        for token in range(4):
            a.append(token)
        b = a.fork()
        b.append(4)
        self.assertEqual(a.blocks[0], b.blocks[0])
        self.assertEqual(len(pool.data), 2)
        b.close()
        a.close()
        self.assertFalse(pool.data)


class SchedulerTests(unittest.TestCase):
    def test_arrivals_work_budget_and_completion(self):
        specs = [('X', 0, 3, 1), ('Y', 5, 9, 5), ('Z', 8, 2, 3)]
        for mode in ['static', 'continuous', 'chunked']:
            result = simulate(mode, specs, token_budget=12, chunk_size=2)
            work = {'prefill': 0, 'decode': 0}
            for frame in result['trace']:
                actions = [entry.split(':') for entry in frame['actions']]
                self.assertLessEqual(sum(int(a[2]) for a in actions), 12)
                for _, phase, amount in actions:
                    work[phase] += int(amount)
                    if mode == 'chunked' and phase == 'prefill':
                        self.assertLessEqual(int(amount), 2)
            self.assertEqual(work, {'prefill': 14, 'decode': 6})
            for record, spec in zip(result['requests'], specs):
                self.assertEqual(len(record['output_times']), spec[3])
                self.assertGreaterEqual(record['output_times'][0], spec[1])

    def test_long_prefill_tradeoff_in_the_hand_worked_fixture(self):
        continuous, chunked = simulate('continuous'), simulate('chunked')
        self.assertEqual(continuous['requests'][0]['max_itl'], 16)
        self.assertEqual(chunked['requests'][0]['max_itl'], 10)
        self.assertEqual(continuous['requests'][3]['ttft'], 28)
        self.assertEqual(chunked['requests'][3]['ttft'], 30)
        self.assertEqual(continuous['finish'], chunked['finish'])


class MetricsTests(unittest.TestCase):
    def test_one_token_has_no_tpot_and_errors_stay_in_denominator(self):
        result = report([
            {'arrival': 0, 'status': 'ok', 'tokens': [20]},
            {'arrival': 0, 'status': 'timeout', 'tokens': []},
        ], 100)
        self.assertIsNone(result['request_tpot_ms'])
        self.assertIsNone(result['token_itl_ms'])
        self.assertEqual(result['error_fraction'], 0.5)
        self.assertEqual(result['goodput_requests_per_s'], 10)

    def test_quantiles_and_linear_layer_lower_bound(self):
        self.assertEqual(percentile([100, 150, 180], 95), 177)
        result = linear_roofline(1)
        self.assertEqual(result['FLOPs'], 134217728)
        self.assertEqual(result['bytes'], 134258688)
        self.assertAlmostEqual(result['lower_bound_ms'], 0.134258688)


if __name__ == '__main__':
    unittest.main()
