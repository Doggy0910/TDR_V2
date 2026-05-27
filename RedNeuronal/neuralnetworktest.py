from ursina import *
import random
import asyncio
import websockets
import threading
import math

app = Ursina()
window.color = color.black

# ================= NODES =================
N = 160
nodes = []

for _ in range(N):
    nodes.append(Entity(
        model='sphere',
        color=color.white,
        scale=0.04,
        position=(random.uniform(-5,5), random.uniform(-3,3), random.uniform(-5,5))
    ))

# ================= QUEUE =================
event_queue = []

# ================= CONNECTION =================
def connect(a, b, intensity=1):
    line = Entity(
        model=Mesh(vertices=[a.position, b.position], mode='line'),
        color=color.rgba(0, 180, 255, 0.25)
    )

    print(f"⚡ conexión {a} -> {b} | intensity {intensity}")

    destroy(line, delay=0.6)

# ================= BRAIN =================
def brain_event(intensity=1):
    print("🧠 BRAIN EVENT:", intensity)

    count = int(20 * intensity)

    for _ in range(count):
        a, b = random.sample(nodes, 2)
        connect(a, b, intensity)

# ================= SOCKET =================
async def handler(ws):
    print("🟢 CLIENT CONNECTED")

    async for msg in ws:
        print("📩 RECIBIDO:", msg)

        try:
            intensity = float(msg)
        except:
            intensity = 1

        event_queue.append(intensity)

async def server():
    print("🧠 SOCKET READY ws://localhost:8765")

    async with websockets.serve(handler, "localhost", 8765):
        await asyncio.Future()

def start_socket():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(server())

threading.Thread(target=start_socket, daemon=True).start()

# ================= UPDATE =================
def update():
    if event_queue:
        intensity = event_queue.pop(0)
        brain_event(intensity)

app.run()