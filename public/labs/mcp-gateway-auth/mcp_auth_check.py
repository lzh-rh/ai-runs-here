"""Read-only test client for the MCP Gateway authentication and authorization lab."""

import argparse
import getpass
import http.client
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

GATEWAY_HOST = "mcp-gateway-openshift-default.openshift-ingress.svc.cluster.local"
TOOL = "openshift_pods_list_in_namespace"
CLIENT = urllib.request.build_opener(urllib.request.ProxyHandler({}))


def fetch(url, payload, headers):
    request = urllib.request.Request(url, data=payload, headers=headers)
    try:
        response = CLIENT.open(request, timeout=20)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        return response.status, response.headers, response.read().decode()


def login(username):
    issuer = os.environ.get("KEYCLOAK_ISSUER", "").rstrip("/")
    if not issuer.startswith("https://"):
        raise ValueError("Set KEYCLOAK_ISSUER to the HTTPS URL of the mcp-auth-lab realm")

    with CLIENT.open(issuer + "/.well-known/openid-configuration", timeout=20) as response:
        discovery = json.load(response)
    if discovery["issuer"] != issuer:
        raise ValueError("Discovery issuer differs from KEYCLOAK_ISSUER")

    endpoint = issuer + "/protocol/openid-connect/token"
    if discovery["token_endpoint"] != endpoint:
        raise ValueError("Unexpected token endpoint; check discovery before entering credentials")

    secret = os.environ.get("KEYCLOAK_CLIENT_SECRET") or getpass.getpass(
        "mcp-gateway client secret: "
    )
    password = getpass.getpass(f"{username} password: ")
    form = urllib.parse.urlencode(
        {
            "grant_type": "password",
            "client_id": "mcp-gateway",
            "client_secret": secret,
            "username": username,
            "password": password,
            "scope": "openid profile",
        }
    ).encode()

    status, _, body = fetch(
        endpoint, form, {"Content-Type": "application/x-www-form-urlencoded"}
    )
    result = json.loads(body)
    if status != 200 or not result.get("access_token"):
        message = result.get("error_description", result.get("error", "token not received"))
        raise ValueError(f"Keycloak HTTP {status}: {message}")

    print(f"Keycloak login succeeded for {username}; token is kept in memory.")
    return result["access_token"]


def decode(body, request_id):
    if body.lstrip().startswith("{"):
        return json.loads(body)
    for line in body.splitlines():
        if line.startswith("data:") and line[5:].strip():
            event = json.loads(line[5:])
            if event.get("id") == request_id:
                return event
    raise ValueError("No matching JSON-RPC response received")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    identity = parser.add_mutually_exclusive_group()
    identity.add_argument("--user", choices=["mcp-reader", "mcp-no-tools"])
    identity.add_argument("--invalid-token", action="store_true")
    identity.add_argument("--token-env", help="Name of an environment variable holding an existing JWT")
    parser.add_argument("--expect-http", type=int, choices=[401])
    parser.add_argument("--expect-denied", action="store_true")
    args = parser.parse_args()

    token = login(args.user) if args.user else ("invalid-lab-token" if args.invalid_token else "")
    if args.token_env:
        token = os.environ.get(args.token_env, "")
        if not token:
            raise ValueError(f"{args.token_env} is empty; request and export a fresh token first")
    headers = {
        "Host": GATEWAY_HOST,
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
    }
    if token:
        headers["Authorization"] = "Bearer " + token

    def rpc(method, params=None, request_id=None):
        payload = {"jsonrpc": "2.0", "method": method}
        if params is not None:
            payload["params"] = params
        if request_id is not None:
            payload["id"] = request_id
        status, received, body = fetch(
            "http://127.0.0.1:18080/mcp", json.dumps(payload).encode(), headers
        )
        print(f"{method}: HTTP {status}")
        if received.get("Mcp-Session-Id"):
            headers["Mcp-Session-Id"] = received["Mcp-Session-Id"]
        return status, body

    initialize = {
        "protocolVersion": "2025-11-25",
        "capabilities": {},
        "clientInfo": {"name": "mcp-auth-lab", "version": "1.0"},
    }
    status, body = rpc("initialize", initialize, 1)

    if args.expect_http:
        if status != args.expect_http:
            raise ValueError(f"Expected HTTP {args.expect_http}, got {status}")
        print("PASS: request without a valid identity was rejected.")
        return

    if status != 200:
        if (
            args.expect_denied
            and status == 500
            and "failed to create session for mcp server" in body
            and "server returned 4xx" in body
        ):
            print("CHECK: confirm the policy's 403 in Authorino or gateway proxy logs (section 4.3).")
            print("HTTP 500 alone does not prove that authorization worked.")
            return
        raise ValueError(f"Initialization failed: HTTP {status}: {body[:300]}")

    initialized = decode(body, 1)
    headers["MCP-Protocol-Version"] = initialized["result"]["protocolVersion"]

    status, _ = rpc("notifications/initialized")
    if status not in (200, 202, 204):
        raise ValueError(f"Initialized notification failed: HTTP {status}")

    status, body = rpc("tools/list", {}, 2)
    if status != 200:
        raise ValueError(f"Tool listing failed: HTTP {status}")
    names = [tool["name"] for tool in decode(body, 2)["result"]["tools"]]
    print(f"Tools ({len(names)}): " + ", ".join(names))
    if TOOL not in names:
        raise ValueError("The expected tool is missing; check registration and prefix")

    status, body = rpc(
        "tools/call", {"name": TOOL, "arguments": {"namespace": "mcp-exp"}}, 3
    )
    result = decode(body, 3) if status == 200 else {"http_status": status, "body": body}
    failed = status != 200 or "error" in result or result.get("result", {}).get("isError", False)

    if args.expect_denied:
        denial = any(
            word in json.dumps(result).lower()
            for word in ("403", "forbidden", "permission denied")
        )
        if status == 500 and "failed to create session for mcp server" in body:
            print("CHECK: confirm the policy's 403 in Authorino or gateway proxy logs (section 4.3).")
            print("HTTP 500 alone does not prove that authorization worked.")
            return
        if not failed or not denial:
            raise ValueError(
                "Expected an authorization denial, not success or an unrelated failure: "
                + json.dumps(result)
            )
        print("CHECK: the tool call was denied. Confirm the tool-policy 403 in the section 4.3 logs.")
    elif failed:
        raise ValueError("Tool call failed: " + json.dumps(result))
    else:
        print(json.dumps(result["result"], indent=2))
        print("PASS: pod-list tool returned data without an MCP error.")


if __name__ == "__main__":
    try:
        main()
    except (
        ValueError,
        KeyError,
        urllib.error.URLError,
        TimeoutError,
        http.client.HTTPException,
    ) as error:
        sys.exit(f"FAIL: {error}")
