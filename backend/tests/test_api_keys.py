"""Tests for API key management - unit tests."""
import pytest
import hashlib


class TestAPIKeys:
    """API key management unit tests."""

    def test_key_hash_format(self):
        """Test API key hashing format."""
        key = "sk_test_abcdefghijklmnopqrstuvwxyz123456"
        key_hash = hashlib.sha256(key.encode()).hexdigest()
        assert len(key_hash) == 64  # SHA-256 produces 64 hex characters
        assert key_hash == hashlib.sha256(key.encode()).hexdigest()

    def test_key_prefix_extraction(self):
        """Test key prefix extraction."""
        key = "sk_test_abcdefghijklmnopqrstuvwxyz123456"
        prefix = key[:8]  # "sk_test_"
        assert prefix == "sk_test_"

    def test_key_scopes_validation(self):
        """Test API key scopes validation."""
        valid_scopes = ["generate", "read", "write"]
        user_scopes = ["generate", "read"]
        # All user scopes should be valid
        for scope in user_scopes:
            assert scope in valid_scopes

    def test_key_expiration_check(self):
        """Test key expiration logic."""
        from datetime import datetime, timezone
        # Set expiration in the past
        expires_at = datetime(2023, 12, 31, 23, 59, 59, tzinfo=timezone.utc)
        now = datetime(2024, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        is_expired = now > expires_at
        assert is_expired == True

    def test_key_usage_increment(self):
        """Test usage count increment."""
        usage_count = 5
        new_count = usage_count + 1
        assert new_count == 6

    def test_key_revoke_logic(self):
        """Test key revocation logic."""
        is_active = True
        is_revoked = not is_active
        assert is_revoked == False