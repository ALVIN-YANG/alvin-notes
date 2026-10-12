"""GPU-only experiment: use an existing CUDA-compatible PyTorch environment."""
import argparse
import json
from pathlib import Path


def main():
    import torch
    from torch.profiler import ProfilerActivity, profile, record_function

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--batch", type=int, default=8)
    parser.add_argument("--sequence", type=int, default=128)
    parser.add_argument("--width", type=int, default=1024)
    parser.add_argument("--iterations", type=int, default=50)
    parser.add_argument("--output-dir", default="gpu-traces")
    args = parser.parse_args()
    if min(args.batch, args.sequence, args.width, args.iterations) < 1:
        parser.error("Dimensions and iteration count must be positive")
    if not torch.cuda.is_available():
        raise SystemExit("CUDA GPU unavailable. No CPU fallback: this experiment measures CUDA.")
    output = Path(args.output_dir)
    output.mkdir(parents=True, exist_ok=True)
    torch.manual_seed(7)
    weight = torch.randn(args.width, 4 * args.width, device="cuda", dtype=torch.float16)
    results = []
    with torch.inference_mode():
        for label, rows in [("prefill_linear", args.batch * args.sequence), ("decode_linear", args.batch)]:
            x = torch.randn(rows, args.width, device="cuda", dtype=torch.float16)
            for _ in range(10):
                y = x @ weight
            torch.cuda.synchronize()
            torch.cuda.reset_peak_memory_stats()
            start, end = torch.cuda.Event(enable_timing=True), torch.cuda.Event(enable_timing=True)
            start.record()
            for _ in range(args.iterations):
                y = x @ weight
            end.record()
            torch.cuda.synchronize()
            elapsed = start.elapsed_time(end) / args.iterations
            with profile(activities=[ProfilerActivity.CPU, ProfilerActivity.CUDA],
                         record_shapes=True, profile_memory=True) as prof:
                for _ in range(5):
                    with record_function(label):
                        y = x @ weight
                torch.cuda.synchronize()
            prof.export_chrome_trace(str(output / f"{label}.json"))
            print(prof.key_averages().table(sort_by="self_cuda_time_total", row_limit=8))
            results.append({"case": label, "rows": rows, "mean_event_ms": elapsed,
                            "peak_tensor_bytes": torch.cuda.max_memory_allocated()})
            del x, y
    print(json.dumps({"torch": torch.__version__, "cuda": torch.version.cuda,
                      "gpu": torch.cuda.get_device_name(), "config": vars(args),
                      "results": results}, indent=2))


if __name__ == "__main__":
    main()
