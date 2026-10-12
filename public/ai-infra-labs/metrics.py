"""Fixed teaching traces and a roofline estimate. These are not measured GPU results."""
import json
import math


def percentile(values, p):
    if not values or not 0 <= p <= 100:
        raise ValueError("Need samples and a percentile in [0,100]")
    ordered = sorted(values)
    position = (len(ordered) - 1) * p / 100
    low, high = math.floor(position), math.ceil(position)
    return ordered[low] + (ordered[high] - ordered[low]) * (position - low)


def report(records, window_ms, ttft_limit=150, e2e_limit=300):
    if window_ms <= 0 or not records:
        raise ValueError("Need records and a positive observation window")
    successful = [r for r in records if r["status"] == "ok"]
    if not successful:
        raise ValueError("This teaching report requires a successful request")
    ttft, e2e, tpot, gaps, good = [], [], [], [], 0
    for r in successful:
        times = r["tokens"]
        if not times or times != sorted(times) or times[0] < r["arrival"]:
            raise ValueError("Invalid token timeline")
        first, final = times[0] - r["arrival"], times[-1] - r["arrival"]
        ttft.append(first)
        e2e.append(final)
        if len(times) > 1:
            tpot.append((times[-1] - times[0]) / (len(times) - 1))
            gaps.extend(b - a for a, b in zip(times, times[1:]))
        good += first <= ttft_limit and final <= e2e_limit
    seconds = window_ms / 1000
    stats = lambda values: {"p50": percentile(values, 50), "p95": percentile(values, 95)} if values else None
    return {"ttft_ms": stats(ttft), "e2e_ms": stats(e2e), "request_tpot_ms": stats(tpot),
            "token_itl_ms": stats(gaps), "error_fraction": 1 - len(successful) / len(records),
            "success_requests_per_s": len(successful) / seconds,
            "output_tokens_per_s": sum(len(r["tokens"]) for r in successful) / seconds,
            "goodput_requests_per_s": good / seconds}


def linear_roofline(rows, width=4096, out=16384, element_bytes=2):
    flops = 2 * rows * width * out
    # Optimistic single-read lower bound: input, weight, output. No attention or launch overhead.
    traffic = element_bytes * (rows * width + width * out + rows * out)
    compute_seconds = flops / 100e12  # Hypothetical 100 TFLOP/s
    memory_seconds = traffic / 1e12   # Hypothetical 1 TB/s
    return {"rows": rows, "FLOPs": flops, "bytes": traffic,
            "FLOPs_per_byte": flops / traffic,
            "lower_bound_ms": 1000 * max(compute_seconds, memory_seconds)}


def main():
    records = [
        {"arrival": 0, "status": "ok", "tokens": [100, 140, 180, 220]},
        {"arrival": 10, "status": "ok", "tokens": [160]},
        {"arrival": 20, "status": "ok", "tokens": [200, 300, 400]},
        {"arrival": 30, "status": "timeout", "tokens": []},
    ]
    result = report(records, 500)
    assert result["ttft_ms"] == {"p50": 150, "p95": 177}
    assert result["request_tpot_ms"] == {"p50": 70, "p95": 97}
    assert result["error_fraction"] == 0.25 and result["goodput_requests_per_s"] == 4
    print(json.dumps({"kind": "fixed teaching data and hypothetical hardware",
                      "metrics": result, "roofline": [linear_roofline(1), linear_roofline(128)]}, indent=2))


if __name__ == "__main__":
    main()
