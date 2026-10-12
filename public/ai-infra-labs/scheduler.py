"""Scheduling simulator. Time units are invented costs, not milliseconds or GPU results."""
import argparse
import json
from dataclasses import dataclass, field


@dataclass
class Request:
    name: str
    arrival: int
    prompt: int
    output: int
    remaining: int = field(init=False)
    emitted: list = field(default_factory=list)

    def __post_init__(self):
        if self.arrival < 0 or self.prompt < 1 or self.output < 1:
            raise ValueError("Invalid request")
        self.remaining = self.prompt


DEFAULTS = [("A", 0, 4, 4), ("B", 0, 4, 1), ("C", 2, 4, 2), ("D", 2, 12, 2)]


def simulate(mode, specs=DEFAULTS, token_budget=16, chunk_size=4):
    if mode not in {"static", "continuous", "chunked"}:
        raise ValueError("Unknown mode")
    if token_budget < 1 or chunk_size < 1:
        raise ValueError("Budgets must be positive")
    all_requests = [Request(*spec) for spec in specs]
    if not all_requests:
        raise ValueError("At least one request is required")
    if mode != "chunked" and max(r.prompt for r in all_requests) > token_budget:
        raise ValueError("Unchunked prompt cannot exceed token_budget")
    waiting = sorted(all_requests, key=lambda r: r.arrival)
    active, trace, now = [], [], 0
    while waiting or active:
        if not active and waiting[0].arrival > now:
            now = waiting[0].arrival
        if mode != "static" or not active:
            while waiting and waiting[0].arrival <= now and len(active) < 4:
                active.append(waiting.pop(0))
        budget, actions = token_budget, []
        # Reserve decode tokens before considering new prefill work.
        for r in active:
            if r.remaining == 0 and budget:
                actions.append((r, "decode", 1))
                budget -= 1
        for r in active:
            if r.remaining == 0 or budget == 0:
                continue
            amount = min(r.remaining, budget, chunk_size) if mode == "chunked" else r.remaining
            if amount <= budget:
                actions.append((r, "prefill", amount))
                budget -= amount
        if not actions:
            raise RuntimeError("No progress; check token budget")
        duration = sum(tokens * (1 if phase == "prefill" else 2)
                       for _, phase, tokens in actions)
        end = now + duration
        for r, phase, tokens in actions:
            if phase == "prefill":
                r.remaining -= tokens
                if r.remaining == 0:
                    r.emitted.append(end)  # First output comes from completed prefill.
            else:
                r.emitted.append(end)
        trace.append({"start": now, "end": end,
                      "actions": [f"{r.name}:{phase}:{tokens}" for r, phase, tokens in actions]})
        active = [r for r in active if len(r.emitted) < r.output]
        now = end
    results = []
    for r in all_requests:
        assert len(r.emitted) == r.output and r.emitted[0] >= r.arrival
        gaps = [b - a for a, b in zip(r.emitted, r.emitted[1:])]
        results.append({"name": r.name, "ttft": r.emitted[0] - r.arrival,
                        "e2e": r.emitted[-1] - r.arrival, "max_itl": max(gaps, default=0),
                        "output_times": r.emitted})
    return {"mode": mode, "kind": "virtual cost units; no GPU prediction",
            "finish": now, "requests": results, "trace": trace}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mode", choices=["static", "continuous", "chunked", "all"], default="all")
    parser.add_argument("--token-budget", type=int, default=16)
    parser.add_argument("--chunk-size", type=int, default=4)
    args = parser.parse_args()
    modes = ["static", "continuous", "chunked"] if args.mode == "all" else [args.mode]
    print(json.dumps([simulate(mode, token_budget=args.token_budget, chunk_size=args.chunk_size)
                      for mode in modes], indent=2))


if __name__ == "__main__":
    main()
