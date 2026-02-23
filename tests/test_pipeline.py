import io
import random
import unittest

from PIL import Image

from spot_heal import center_crop_to_aspect, compress_to_max_size


class PipelineTests(unittest.TestCase):
    def test_center_crop_to_16_9(self):
        image = Image.new("RGB", (1000, 1000), "white")
        cropped = center_crop_to_aspect(image, 16, 9)
        self.assertEqual(cropped.size, (1000, 562))

    def test_compress_to_max_size(self):
        image = Image.new("RGB", (1280, 720))
        pixels = image.load()
        rng = random.Random(7)
        for y in range(720):
            for x in range(1280):
                pixels[x, y] = (rng.randrange(256), rng.randrange(256), rng.randrange(256))

        data = compress_to_max_size(image, max_bytes=50_000)
        self.assertLessEqual(len(data), 50_000)

        decoded = Image.open(io.BytesIO(data))
        self.assertEqual(decoded.size, (1280, 720))


if __name__ == "__main__":
    unittest.main()
