"""Find the real cause of the 429s: token volume, or concurrency?"""

import asyncio
import time

from google import genai

MODEL = "gemini-2.5-flash"


def kind(e: Exception) -> str:
    s = str(e)
    return "429" if ("429" in s or "RESOURCE_EXHAUSTED" in s) else "ERR"


def hypothesis_a() -> None:
    """Token volume. Our agents send tool schemas + full claim JSON + injected state."""
    c = genai.Client()
    big = "Here is a claim record. " + ("field_name: some_value_data. " * 400)
    print(f"A) LARGE prompts (~{len(big)//4} tokens), sequential:")
    t0 = time.time()
    for i in range(1, 6):
        try:
            c.models.generate_content(model=MODEL, contents=big + " Reply OK.")
            print(f"   {i}. OK    (t+{time.time()-t0:4.1f}s)")
        except Exception as e:
            print(f"   {i}. {kind(e)}   (t+{time.time()-t0:4.1f}s)  {str(e)[:60]}")


async def hypothesis_b() -> None:
    """Concurrency. ParallelAgent fires researchers simultaneously."""
    ac = genai.Client().aio

    async def one(i: int) -> bool:
        try:
            await ac.models.generate_content(model=MODEL, contents="say hi")
            return True
        except Exception as e:
            print(f"      #{i} -> {kind(e)}")
            return False

    print("\nB) CONCURRENT requests:")
    for n in (2, 4, 8, 16):
        t = time.time()
        res = await asyncio.gather(*[one(i) for i in range(1, n + 1)])
        ok = sum(res)
        flag = "" if ok == n else "   <-- FAILS HERE"
        print(f"   {n:2} at once -> {ok}/{n} ok  ({time.time()-t:.1f}s){flag}")


if __name__ == "__main__":
    hypothesis_a()
    asyncio.run(hypothesis_b())
