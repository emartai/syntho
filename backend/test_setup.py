#!/usr/bin/env python3
"""
Simple script to test backend setup and dependencies.
Run with: python test_setup.py
"""

import sys


def test_imports():
    """Test that all required packages can be imported."""
    print("Testing imports...")
    
    required_packages = [
        ("fastapi", "FastAPI"),
        ("uvicorn", "Uvicorn"),
        ("pydantic", "Pydantic"),
        ("pydantic_settings", "Pydantic Settings"),
        ("jose", "Python-JOSE"),
        ("supabase", "Supabase"),
        ("pandas", "Pandas"),
        ("magic", "Python-Magic"),
    ]
    
    failed = []
    
    for package, name in required_packages:
        try:
            __import__(package)
            print(f"✓ {name}")
        except ImportError as e:
            print(f"✗ {name}: {str(e)}")
            failed.append(name)
    
    if failed:
        print(f"\n❌ Failed to import: {', '.join(failed)}")
        print("Run: pip install -r requirements.txt")
        return False
    
    print("\n✅ All imports successful!")
    return True


def test_app_structure():
    """Test that app structure is correct."""
    print("\nTesting app structure...")
    
    try:
        from app.config import settings
        print("✓ Config loaded")
        
        from app.middleware.auth import get_current_user
        print("✓ Auth middleware loaded")
        
        from app.services.supabase import get_supabase
        print("✓ Supabase service loaded")
        
        from app.services.storage import storage_service
        print("✓ Storage service loaded")
        
        from app.models.schemas import DatasetResponse
        print("✓ Schemas loaded")
        
        from app.routers.datasets import router
        print("✓ Datasets router loaded")
        
        from app.main import app
        print("✓ FastAPI app loaded")
        
        print("\n✅ App structure is correct!")
        return True
        
    except Exception as e:
        print(f"\n❌ Error loading app: {str(e)}")
        return False


def test_config():
    """Test configuration loading."""
    print("\nTesting configuration...")
    
    try:
        from app.config import settings
        
        # Check that settings object exists
        print(f"✓ Settings object created")
        
        # Check required attributes
        required_attrs = [
            'max_file_size',
            'allowed_file_types',
            'datasets_bucket',
            'synthetic_bucket',
            'reports_bucket'
        ]
        
        for attr in required_attrs:
            if hasattr(settings, attr):
                print(f"✓ {attr}: {getattr(settings, attr)}")
            else:
                print(f"✗ Missing attribute: {attr}")
                return False
        
        print("\n✅ Configuration is valid!")
        return True
        
    except Exception as e:
        print(f"\n❌ Error loading config: {str(e)}")
        print("Make sure .env file exists with required variables")
        return False


def main():
    """Run all tests."""
    print("=" * 60)
    print("Syntho Backend Setup Test")
    print("=" * 60)
    
    results = []
    
    results.append(("Imports", test_imports()))
    results.append(("App Structure", test_app_structure()))
    results.append(("Configuration", test_config()))
    
    print("\n" + "=" * 60)
    print("Test Results")
    print("=" * 60)
    
    for name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{name}: {status}")
    
    all_passed = all(result[1] for result in results)
    
    if all_passed:
        print("\n🎉 All tests passed! Backend is ready.")
        print("\nTo start the server, run:")
        print("  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
        return 0
    else:
        print("\n⚠️  Some tests failed. Please fix the issues above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
