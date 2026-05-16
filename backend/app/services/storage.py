from __future__ import annotations

import io
from typing import Tuple

import boto3
from botocore.config import Config

from app.core.config import settings


def get_s3_client():
    return boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint_url,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
        region_name=settings.s3_region,
        config=Config(signature_version="s3v4", retries={"max_attempts": 2}),
    )


def upload_photo(key: str, data: bytes, mime_type: str) -> str:
    client = get_s3_client()
    client.put_object(
        Bucket=settings.s3_bucket,
        Key=key,
        Body=data,
        ContentType=mime_type,
    )
    return key


def download_photo(key: str) -> Tuple[bytes, str]:
    client = get_s3_client()
    resp = client.get_object(Bucket=settings.s3_bucket, Key=key)
    body = resp["Body"].read()
    mime_type = resp.get("ContentType", "image/jpeg")
    return body, mime_type


def delete_photo(key: str) -> None:
    client = get_s3_client()
    client.delete_object(Bucket=settings.s3_bucket, Key=key)


def download_photo_to_bytesio(key: str) -> io.BytesIO:
    data, _ = download_photo(key)
    return io.BytesIO(data)
