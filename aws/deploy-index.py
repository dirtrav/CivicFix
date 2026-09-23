import json
import os
import urllib.error
import urllib.parse
import urllib.request
from uuid import UUID, uuid4

import boto3
from botocore.config import Config

bucket = os.environ["UPLOADS_BUCKET"]
region = os.environ.get("AWS_REGION", "ap-south-1")
s3 = boto3.client(
    "s3",
    region_name=region,
    endpoint_url=f"https://s3.{region}.amazonaws.com",
    config=Config(signature_version="s3v4"),
)
allowed_types = {"image/jpeg", "image/png", "image/webp"}


def response(status, payload):
    return {
        "statusCode": status,
        "headers": {
            "content-type": "application/json",
            "access-control-allow-origin": "*",
        },
        "body": json.dumps(payload),
    }


def parse_body(event):
    try:
        return json.loads(event.get("body") or "{}")
    except Exception:
        return None


def supabase_request(path, token, method="GET", payload=None, prefer_return=True):
    headers = {
        "apikey": os.environ["SUPABASE_ANON_KEY"],
        "Authorization": f"Bearer {token}",
    }
    data = None
    if payload is not None:
        headers["Content-Type"] = "application/json"
        if prefer_return:
            headers["Prefer"] = "return=representation"
        data = json.dumps(payload).encode()
    request = urllib.request.Request(
        f'{os.environ["SUPABASE_URL"]}/rest/v1/{path}',
        data=data,
        headers=headers,
        method=method,
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as result:
            return result.status, result.read()
    except urllib.error.HTTPError as error:
        return error.code, error.read()


def current_user(event):
    headers = event.get("headers") or {}
    raw = headers.get("authorization") or headers.get("Authorization") or ""
    token = raw.removeprefix("Bearer ").removeprefix("bearer ").strip()
    if not token:
        return None
    request = urllib.request.Request(
        f'{os.environ["SUPABASE_URL"]}/auth/v1/user',
        headers={
            "apikey": os.environ["SUPABASE_ANON_KEY"],
            "Authorization": f"Bearer {token}",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as result:
            status, body = result.status, result.read()
    except urllib.error.HTTPError as error:
        status, body = error.code, error.read()
    if status >= 300:
        return None
    user = json.loads(body)
    return user, token


def delete_report_objects(issue_id):
    prefix = f"issues/{issue_id}/"
    key_marker = None
    version_marker = None
    while True:
        params = {"Bucket": bucket, "Prefix": prefix}
        if key_marker:
            params["KeyMarker"] = key_marker
        if version_marker:
            params["VersionIdMarker"] = version_marker
        page = s3.list_object_versions(**params)
        targets = []
        for version in page.get("Versions", []) + page.get("DeleteMarkers", []):
            if version["Key"].startswith(prefix):
                targets.append({"Key": version["Key"], "VersionId": version["VersionId"]})
        for offset in range(0, len(targets), 1000):
            deleted = s3.delete_objects(
                Bucket=bucket,
                Delete={"Objects": targets[offset:offset + 1000], "Quiet": True},
            )
            errors = deleted.get("Errors", [])
            if errors:
                print(json.dumps({"s3_delete_errors": errors, "issue_id": issue_id}))
                return False
        if not page.get("IsTruncated"):
            return True
        key_marker = page.get("NextKeyMarker")
        version_marker = page.get("NextVersionIdMarker")


def handler(event, context):
    raw_path = event.get("rawPath") or event.get("path") or ""
    method = ((event.get("requestContext") or {}).get("http") or {}).get("method") or event.get("httpMethod") or ""
    print(json.dumps({"route": raw_path, "method": method}))
    auth = current_user(event)
    public_view = raw_path == "/uploads/view" and method == "POST"
    if not auth and not public_view:
        return response(401, {"error": "Sign in required."})
    user, token = auth if auth else (None, os.environ["SUPABASE_ANON_KEY"])
    data = parse_body(event)
    if data is None:
        return response(400, {"error": "Invalid JSON."})

    if raw_path == "/uploads/presign" and method == "POST":
        issue_id = str(data.get("issueId") or "")
        content_type = str(data.get("contentType") or "")
        file_size = int(data.get("fileSize") or 0)
        if not issue_id or content_type not in allowed_types or file_size <= 0 or file_size > 10 * 1024 * 1024:
            return response(400, {"error": "Invalid photo or size."})
        path = f'issues?id=eq.{urllib.parse.quote(issue_id)}&reporter_id=eq.{urllib.parse.quote(user["id"])}&select=id&limit=1'
        status, raw = supabase_request(path, token)
        issues = json.loads(raw) if status < 300 else []
        if not issues:
            return response(403, {"error": "You can only attach photos to your own reports."})
        key = f'issues/{issue_id}/{user["id"]}/{uuid4()}.{content_type.split("/")[-1]}'
        url = s3.generate_presigned_url(
            "put_object",
            Params={"Bucket": bucket, "Key": key, "ContentType": content_type},
            ExpiresIn=300,
        )
        print(json.dumps({"presigned_host": urllib.parse.urlparse(url).netloc, "key": key}))
        return response(200, {"uploadUrl": url, "objectKey": key})

    if raw_path == "/uploads/complete" and method == "POST":
        issue_id = str(data.get("issueId") or "")
        object_key = str(data.get("objectKey") or "")
        content_type = str(data.get("contentType") or "")
        file_size = int(data.get("fileSize") or 0)
        if not object_key.startswith(f'issues/{issue_id}/{user["id"]}/') or content_type not in allowed_types or file_size <= 0 or file_size > 10 * 1024 * 1024:
            return response(400, {"error": "Invalid attachment."})
        try:
            uploaded = s3.head_object(Bucket=bucket, Key=object_key)
        except Exception:
            return response(400, {"error": "Uploaded object was not found."})
        if uploaded.get("ContentType") != content_type or not uploaded.get("ContentLength") or uploaded["ContentLength"] > 10 * 1024 * 1024:
            return response(400, {"error": "Uploaded photo metadata is invalid."})
        status, raw = supabase_request(
            "issue_attachments",
            token,
            method="POST",
            payload={
                "issue_id": issue_id,
                "uploader_id": user["id"],
                "object_key": object_key,
                "content_type": uploaded["ContentType"],
                "byte_size": uploaded["ContentLength"],
            },
        )
        if status >= 300:
            print(json.dumps({"attachment_insert_status": status, "body": raw.decode(errors="replace")}))
            return response(500, {"error": "Could not save attachment metadata."})
        rows = json.loads(raw) if raw else []
        return response(201, rows[0] if rows else {})

    if raw_path == "/uploads/view" and method == "POST":
        issue_id = str(data.get("issueId") or "")
        try:
            issue_id = str(UUID(issue_id))
        except Exception:
            return response(400, {"error": "Invalid report id."})
        status, raw = supabase_request(
            f"issues_public?id=eq.{urllib.parse.quote(issue_id)}&select=id&limit=1", token
        )
        if status >= 300 or not json.loads(raw or b"[]"):
            return response(404, {"error": "Report not found."})
        status, raw = supabase_request(
            f"issue_attachments?issue_id=eq.{urllib.parse.quote(issue_id)}&select=object_key,content_type&order=created_at.asc",
            token,
        )
        if status >= 300:
            return response(500, {"error": "Could not load report photos."})
        attachments = json.loads(raw or b"[]")
        photos = [
            {
                "url": s3.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": bucket, "Key": item["object_key"]},
                    ExpiresIn=3600,
                ),
                "contentType": item["content_type"],
            }
            for item in attachments
        ]
        return response(200, {"photos": photos})

    if raw_path == "/issues/delete" and method == "POST":
        issue_id = str(data.get("issueId") or "")
        try:
            issue_id = str(UUID(issue_id))
        except Exception:
            return response(400, {"error": "Invalid report id."})

        status, raw = supabase_request(
            f"profiles?id=eq.{urllib.parse.quote(user['id'])}&select=role,department_id&limit=1", token
        )
        profiles = json.loads(raw or b"[]") if status < 300 else []
        if not profiles or profiles[0].get("role") not in ("admin", "staff"):
            return response(403, {"error": "Only admins and staff can delete reports."})
        role = profiles[0]["role"]

        status, raw = supabase_request(
            f"issues?id=eq.{urllib.parse.quote(issue_id)}&select=id,department_id&limit=1", token
        )
        issues = json.loads(raw or b"[]") if status < 300 else []
        if not issues:
            return response(404, {"error": "Report not found or not accessible."})
        if role == "staff" and issues[0].get("department_id") != profiles[0].get("department_id"):
            return response(403, {"error": "Staff can only delete reports in their department."})

        if not delete_report_objects(issue_id):
            return response(502, {"error": "Could not remove every AWS photo version. The report is still in the database; retry deletion."})

        status, raw = supabase_request(
            "rpc/delete_issue", token, method="POST", payload={"p_issue_id": issue_id}, prefer_return=False
        )
        if status >= 300:
            print(json.dumps({"delete_issue_status": status, "body": raw.decode(errors="replace")}))
            return response(502, {"error": "AWS photos were removed, but the report record could not be deleted. Retry deletion."})
        return response(200, {"deleted": True})

    return response(404, {"error": "Not found."})
