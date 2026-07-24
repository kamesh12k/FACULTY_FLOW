import asyncio
import time
import httpx

# A simple tabulate implementation in case tabulate package is not installed
def tabulate(data, headers, tablefmt="grid"):
    # Calculate column widths
    widths = [len(h) for h in headers]
    for row in data:
        for i, val in enumerate(row):
            widths[i] = max(widths[i], len(str(val)))
            
    # Format line separator
    sep = "+" + "+".join(["-" * (w + 2) for w in widths]) + "+"
    
    lines = [sep]
    # Format headers
    lines.append("| " + " | ".join([str(h).ljust(widths[i]) for i, h in enumerate(headers)]) + " |")
    lines.append(sep)
    # Format rows
    for row in data:
        lines.append("| " + " | ".join([str(val).ljust(widths[i]) for i, val in enumerate(row)]) + " |")
    lines.append(sep)
    return "\n".join(lines)

BASE_URL = "http://localhost:8000"
TIMEOUT = 30.0

# Pre-seeded users
TEACHERS = [f"teacher_{i:03d}@institution.edu" for i in range(1, 201)]
HODS = [f"hod_{i:03d}" for i in range(1, 31)]
PASSWORD = "changeme"

async def login_user(client: httpx.AsyncClient, identifier: str) -> str | None:
    """Fetch JWT token for a user."""
    try:
        response = await client.post(
            f"{BASE_URL}/auth/login",
            json={"identifier": identifier, "password": PASSWORD},
            timeout=TIMEOUT
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        else:
            print(f"Failed login for {identifier}: HTTP {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"Exception during login for {identifier}: {e}")
        return None

async def submit_leave(client: httpx.AsyncClient, token: str, teacher_id: int) -> dict:
    """Simulate a teacher submitting a leave request."""
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "date": "2026-07-27",  # Test working date
        "period_number": (teacher_id % 5) + 1,
        "reason": f"Casual Leave - Load Test submission {teacher_id}"
    }
    
    start_time = time.perf_counter()
    try:
        # Submit leave
        response = await client.post(
            f"{BASE_URL}/leaves/",
            json=payload,
            headers=headers,
            timeout=TIMEOUT
        )
        latency = time.perf_counter() - start_time
        return {
            "success": response.status_code == 201,
            "latency": latency,
            "status_code": response.status_code,
            "error": None if response.status_code == 201 else response.text
        }
    except Exception as e:
        latency = time.perf_counter() - start_time
        return {
            "success": False,
            "latency": latency,
            "status_code": 0,
            "error": str(e)
        }

async def query_dashboard(client: httpx.AsyncClient, token: str, hod_id: int) -> dict:
    """Simulate HOD accessing dashboard/filtering leaves."""
    headers = {"Authorization": f"Bearer {token}"}
    
    start_time = time.perf_counter()
    try:
        # HOD queries pending leaves
        response = await client.get(
            f"{BASE_URL}/leaves/?status=pending",
            headers=headers,
            timeout=TIMEOUT
        )
        latency = time.perf_counter() - start_time
        return {
            "success": response.status_code == 200,
            "latency": latency,
            "status_code": response.status_code,
            "error": None if response.status_code == 200 else response.text
        }
    except Exception as e:
        latency = time.perf_counter() - start_time
        return {
            "success": False,
            "latency": latency,
            "status_code": 0,
            "error": str(e)
        }

async def run_load_test():
    async with httpx.AsyncClient() as client:
        # 1. Pre-Authentication phase (sequential to prevent CPU bcrypt bottleneck)
        print("=== Step 1: Pre-Authenticating Users (Sequential Hashing) ===")
        teacher_tokens = []
        for i, email in enumerate(TEACHERS):
            token = await login_user(client, email)
            if token:
                teacher_tokens.append((i + 1, token))
            if (i + 1) % 50 == 0:
                print(f"  Authenticated {i + 1}/200 teachers...")
                
        hod_tokens = []
        for i, username in enumerate(HODS):
            token = await login_user(client, username)
            if token:
                hod_tokens.append((i + 1, token))
        print(f"  Authenticated {len(hod_tokens)}/30 HODs.")
        
        if not teacher_tokens or not hod_tokens:
            print("ERROR: Authentication failed for critical users. Aborting test.")
            return

        print("\n=== Step 2: Running Concurrent Load Test (200 Teachers, 30 HODs) ===")
        print("Starting concurrent API execution...")
        
        # Staggered launch tasks
        tasks = []
        
        # Simulate 200 teachers submitting leaves (staggered slightly within a small window)
        for teacher_id, token in teacher_tokens:
            async def staggered_submit(t=token, tid=teacher_id):
                # Stagger launch slightly (0 to 3 seconds) for density
                await asyncio.sleep(tid % 4 * 0.5)
                return await submit_leave(client, t, tid)
            tasks.append(staggered_submit())
            
        # Simulate 30 HODs concurrently querying dashboard
        for hod_id, token in hod_tokens:
            async def HOD_task(t=token, hid=hod_id):
                await asyncio.sleep(hid % 3 * 0.3)
                return await query_dashboard(client, t, hid)
            tasks.append(HOD_task())
            
        # Execute concurrently
        start_time = time.perf_counter()
        results = await asyncio.gather(*tasks)
        total_time = time.perf_counter() - start_time
        
        print(f"Completed all concurrent operations in {total_time:.2f} seconds.\n")
        
        # 3. Analyze results
        teacher_latencies = []
        hod_latencies = []
        
        teacher_success = 0
        teacher_failed = 0
        hod_success = 0
        hod_failed = 0
        
        # Map back results (first 200 are teachers, next 30 are HODs)
        for i, res in enumerate(results):
            if i < len(teacher_tokens):
                teacher_latencies.append(res["latency"])
                if res["success"]:
                    teacher_success += 1
                else:
                    teacher_failed += 1
            else:
                hod_latencies.append(res["latency"])
                if res["success"]:
                    hod_success += 1
                else:
                    hod_failed += 1
                    
        # Print metrics report
        def print_stats(name, latencies, success, failed):
            if not latencies:
                print(f"No data for {name}")
                return
            sorted_lat = sorted(latencies)
            n = len(sorted_lat)
            avg_lat = sum(sorted_lat) / n
            p90_idx = min(int(n * 0.90), n - 1)
            p95_idx = min(int(n * 0.95), n - 1)
            p90_lat = sorted_lat[p90_idx]
            p95_lat = sorted_lat[p95_idx]
            min_lat = sorted_lat[0]
            max_lat = sorted_lat[-1]
            total = success + failed
            success_rate = (success / total) * 100 if total > 0 else 0
            
            headers = ["Metric", "Value"]
            data = [
                ["Total Requests", total],
                ["Success Requests", success],
                ["Failed Requests", failed],
                ["Success Rate", f"{success_rate:.2f}%"],
                ["Min Latency", f"{min_lat:.3f}s"],
                ["Average Latency", f"{avg_lat:.3f}s"],
                ["90th Percentile (p90)", f"{p90_lat:.3f}s"],
                ["95th Percentile (p95)", f"{p95_lat:.3f}s"],
                ["Max Latency", f"{max_lat:.3f}s"]
            ]
            print(f"--- {name} Results ---")
            print(tabulate(data, headers=headers, tablefmt="grid"))
            print()

        print_stats("Teacher Leave Submission (POST /leaves/)", teacher_latencies, teacher_success, teacher_failed)
        print_stats("HOD Dashboard Access (GET /leaves/?status=pending)", hod_latencies, hod_success, hod_failed)

if __name__ == "__main__":
    asyncio.run(run_load_test())
