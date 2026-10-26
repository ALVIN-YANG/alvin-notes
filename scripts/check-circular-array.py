"""Execute the published Python blocks and compare rotations with a list model."""
import random
import re
import unittest
from pathlib import Path

source = (Path(__file__).resolve().parents[1] / 'src/data/system-design-supplements/circular-array.md').read_text()
blocks = re.findall(r'```python\n(.*?)\n```', source, re.S)
assert len(blocks) == 2, 'Review changed article code blocks'
namespace = {}
exec(compile(blocks[0], 'circular-array-article', 'exec'), namespace)
CircularArray = namespace['CircularArray']


class CircularArrayChecks(unittest.TestCase):
    def test_published_example(self):
        exec(compile(blocks[1], 'circular-array-example', 'exec'), namespace.copy())

    def test_rotations_and_writes_against_list(self):
        rng = random.Random(20261026)
        for size in range(12):
            original = list(range(size))
            reference = original.copy()
            array = CircularArray(original)
            for _ in range(300):
                shift = rng.randint(-10000, 10000)
                array.rotate(shift)
                if size:
                    split = shift % size
                    reference = reference[split:] + reference[:split]
                    i = rng.randrange(-size, size)
                    value = rng.randint(-100, 100)
                    array[i] = value
                    reference[i] = value
                    self.assertEqual([array[j] for j in range(size)], reference)
                    self.assertEqual([array[j] for j in range(-size, 0)], reference)
                self.assertEqual(list(array), reference)
                self.assertEqual(len(array), size)
            self.assertEqual(original, list(range(size)))

    def test_empty_invalid_indices_and_types(self):
        for size in [0, 1, 4]:
            array = CircularArray(range(size))
            for i in [size, -size - 1]:
                with self.assertRaises(IndexError):
                    _ = array[i]
                with self.assertRaises(IndexError):
                    array[i] = 9
            for i in [1.5, '1', slice(0, 1), None]:
                with self.assertRaises(TypeError):
                    _ = array[i]
                with self.assertRaises(TypeError):
                    array[i] = 9
                with self.assertRaises(TypeError):
                    array.rotate(i)

    def test_snapshot_and_integer_protocol(self):
        class Offset:
            def __index__(self):
                return 1
        first = {'value': 1}
        array = CircularArray([first, 'B', 'C'])
        snapshot = iter(array)
        array.rotate(Offset())
        self.assertEqual(array[Offset()], 'C')
        array[Offset()] = 'X'
        array[-1] = 'replacement'
        first['value'] = 2
        self.assertEqual(list(snapshot), [{'value': 2}, 'B', 'C'])
        self.assertEqual(list(array), ['B', 'X', 'replacement'])
        array.rotate(10 ** 100)
        self.assertEqual(list(array), ['X', 'replacement', 'B'])


if __name__ == '__main__':
    unittest.main()
