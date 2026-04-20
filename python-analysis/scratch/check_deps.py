import sys

def check_dependencies():
    required = [
        'pandas', 'numpy', 'matplotlib', 'seaborn', 
        'plotly', 'sklearn', 'catboost', 'xgboost', 
        'dill', 'flask', 'flask_cors'
    ]
    
    missing = []
    for lib in required:
        try:
            __import__(lib)
            print(f"✅ {lib} is installed.")
        except ImportError:
            print(f"❌ {lib} is NOT installed.")
            missing.append(lib)
    
    if missing:
        print(f"\nMissing libraries: {', '.join(missing)}")
        print("Please run: pip install " + " ".join(missing))
    else:
        print("\nAll dependencies are met!")

if __name__ == "__main__":
    check_dependencies()
