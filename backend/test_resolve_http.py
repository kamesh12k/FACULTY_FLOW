import urllib.request
import json
import sys

# 1. Login to get token
login_data = json.dumps({'identifier': 'sysadmin', 'password': 'Password123'}).encode()
req = urllib.request.Request(
    'http://localhost:8000/auth/login',
    data=login_data,
    headers={'Content-Type': 'application/json'},
    method='POST'
)
try:
    with urllib.request.urlopen(req) as res:
        login_resp = json.loads(res.read().decode())
        token = login_resp['access_token']
except Exception as e:
    print("Login failed:", e)
    sys.exit(1)

# 2. Call /academic-calendar/resolve?date=2026-07-17
req_resolve = urllib.request.Request(
    'http://localhost:8000/academic-calendar/resolve?date=2026-07-17',
    headers={'Authorization': f'Bearer {token}'},
    method='GET'
)
try:
    with urllib.request.urlopen(req_resolve) as res:
        resolve_resp = json.loads(res.read().decode())
        print("HTTP Resolve Response:", resolve_resp)
except Exception as e:
    print("Resolve request failed:", e)
