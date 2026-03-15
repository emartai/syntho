"""
Production Readiness Audit Test Suite
Comprehensive checks across all layers of the Syntho MVP
"""
import os
import pytest
from pathlib import Path

class TestPhase1EnvironmentAudit:
    """Phase 1: Environment Variable Audit"""
    
    def test_frontend_env_vars(self):
        """Check all required frontend environment variables"""
        frontend_env = Path("../frontend/.env.local")
        assert frontend_env.exists(), "frontend/.env.local file missing"
        
        with open(frontend_env) as f:
            content = f.read()
        
        required_vars = {
            "NEXT_PUBLIC_SUPABASE_URL": "Supabase project URL",
            "NEXT_PUBLIC_SUPABASE_ANON_KEY": "Supabase anonymous key",
            "NEXT_PUBLIC_FLAG_MARKETPLACE": "Marketplace feature flag",
            "NEXT_PUBLIC_FLAG_API_KEYS": "API Keys feature flag",
            "NEXT_PUBLIC_FLAG_GROQ_AI": "Groq AI feature flag",
            "NEXT_PUBLIC_FLAG_ADMIN_PANEL": "Admin panel feature flag",
            "NEXT_PUBLIC_FLAG_NOTIFICATIONS": "Notifications feature flag",
            "NEXT_PUBLIC_FLAG_TEAM_ACCOUNTS": "Team accounts feature flag",
        }
        
        missing = []
        present = []
        
        for var, description in required_vars.items():
            if var in content and f"{var}=" in content:
                # Check if it has a value (not just placeholder)
                for line in content.split('\n'):
                    if line.startswith(f"{var}="):
                        value = line.split('=', 1)[1].strip()
                        if value and not value.startswith('your_'):
                            present.append(var)
                        else:
                            missing.append((var, description))
                        break
            else:
                missing.append((var, description))
        
        # Print results
        for var in present:
            print(f"✅ {var}")
        
        for var, desc in missing:
            print(f"⚠️  MISSING: {var} — needed for {desc}")
        
        # Feature flags must be "false" for MVP
        flag_checks = {
            "NEXT_PUBLIC_FLAG_MARKETPLACE": "false",
            "NEXT_PUBLIC_FLAG_API_KEYS": "false",
            "NEXT_PUBLIC_FLAG_GROQ_AI": "false",
            "NEXT_PUBLIC_FLAG_ADMIN_PANEL": "false",
            "NEXT_PUBLIC_FLAG_NOTIFICATIONS": "false",
            "NEXT_PUBLIC_FLAG_TEAM_ACCOUNTS": "false",
        }
        
        for flag, expected in flag_checks.items():
            for line in content.split('\n'):
                if line.startswith(f"{flag}="):
                    value = line.split('=', 1)[1].strip()
                    assert value == expected, f"{flag} must be '{expected}' for MVP, got '{value}'"
        
        if missing:
            pytest.fail(f"Missing {len(missing)} required frontend environment variables")
    
    def test_backend_env_vars(self):
        """Check all required backend environment variables"""
        backend_env = Path(".env")
        assert backend_env.exists(), "backend/.env file missing"
        
        with open(backend_env) as f:
            content = f.read()
        
        required_vars = {
            "SUPABASE_URL": "Supabase project URL",
            "SUPABASE_SERVICE_KEY": "Supabase service role key",
            "MODAL_API_URL": "Modal ML service endpoint",
            "JWT_SECRET": "JWT signing secret (or SUPABASE_JWT_SECRET)",
            "FRONTEND_URL": "Frontend URL for CORS",
            "ALLOWED_ORIGINS": "CORS allowed origins (or FRONTEND_URL)",
        }
        
        missing = []
        present = []
        
        # Check for JWT_SECRET or SUPABASE_JWT_SECRET
        has_jwt = "JWT_SECRET=" in content or "SUPABASE_JWT_SECRET=" in content
        
        for var, description in required_vars.items():
            if var == "JWT_SECRET" and has_jwt:
                present.append("JWT_SECRET (or SUPABASE_JWT_SECRET)")
                continue
            if var == "ALLOWED_ORIGINS" and "FRONTEND_URL=" in content:
                # FRONTEND_URL can substitute for ALLOWED_ORIGINS
                present.append("ALLOWED_ORIGINS (via FRONTEND_URL)")
                continue
                
            if var in content and f"{var}=" in content:
                for line in content.split('\n'):
                    if line.startswith(f"{var}="):
                        value = line.split('=', 1)[1].strip()
                        if value and not value.startswith('your_'):
                            present.append(var)
                        else:
                            missing.append((var, description))
                        break
            else:
                missing.append((var, description))
        
        for var in present:
            print(f"✅ {var}")
        
        for var, desc in missing:
            print(f"⚠️  MISSING: {var} — needed for {desc}")
        
        if missing:
            pytest.fail(f"Missing {len(missing)} required backend environment variables")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
