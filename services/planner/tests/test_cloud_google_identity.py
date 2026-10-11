"""Configured account gates use trusted authorizer claims, not a client email."""
import json
from copy import deepcopy
from uuid import uuid4

import pytest
from test_cloud_foundation import cloud, event


def test_google_only_identity_and_workspace_accounts(monkeypatch):
    monkeypatch.setenv("GOOGLE_ONLY", "true")
    monkeypatch.setenv("AUTH_CLIENT_ID", "testclient")
    request = event(str(uuid4()), "/v1/example")
    claims = request["requestContext"]["authorizer"]["claims"]
    claims.update(aud="testclient", token_use="id", email="coordinator@organization.example", email_verified="true", identities=json.dumps([{"providerName": "Google"}]))
    assert cloud.identity(request) == claims["sub"]
    for change in [{"aud": "otherclient"}, {"token_use": "access"}, {"email_verified": "false"}, {"identities": "not-json"}, {"identities": "{}"}, {"identities": '[{"providerName":"COGNITO"}]'}]:
        invalid = deepcopy(request)
        invalid["requestContext"]["authorizer"]["claims"].update(change)
        with pytest.raises(cloud.ApiError) as error:
            cloud.identity(invalid)
        assert error.value.status == 401


def test_google_and_verified_native_accounts(monkeypatch):
    monkeypatch.delenv("GOOGLE_ONLY", raising=False)
    monkeypatch.setenv("AUTH_METHODS", "google_email")
    monkeypatch.setenv("AUTH_CLIENT_ID", "testclient")
    request = event(str(uuid4()), "/v1/example")
    claims = request["requestContext"]["authorizer"]["claims"]
    claims.update(aud="testclient", token_use="id", email="member@organization.example", email_verified="true")
    assert cloud.identity(request) == claims["sub"]
    claims["identities"] = json.dumps([{"providerName": "Google"}])
    assert cloud.identity(request) == claims["sub"]
    for change in [{"aud": "otherclient"}, {"token_use": "access"}, {"email_verified": "false"}, {"email": ""}, {"identities": "not-json"}, {"identities": "{}"}, {"identities": '[{"providerName":"Facebook"}]'}]:
        invalid = deepcopy(request)
        invalid["requestContext"]["authorizer"]["claims"].update(change)
        with pytest.raises(cloud.ApiError) as error:
            cloud.identity(invalid)
        assert error.value.status == 401


def test_email_first_release_rejects_federated_accounts(monkeypatch):
    monkeypatch.delenv("GOOGLE_ONLY", raising=False)
    monkeypatch.setenv("AUTH_METHODS", "email")
    monkeypatch.setenv("AUTH_CLIENT_ID", "testclient")
    request = event(str(uuid4()), "/v1/example")
    claims = request["requestContext"]["authorizer"]["claims"]
    claims.update(aud="testclient", token_use="id", email="member@organization.example", email_verified="true")
    assert cloud.identity(request) == claims["sub"]
    claims["identities"] = json.dumps([{"providerName": "Google"}])
    with pytest.raises(cloud.ApiError) as error:
        cloud.identity(request)
    assert error.value.status == 401
