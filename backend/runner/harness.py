import sys
import json
import time
import traceback

# 1. Import User Code
# The user's code is saved as 'solution.py' in the same directory.
try:
    from solution import Solution
except ImportError:
    print(json.dumps([{"status": "system_error", "error": "Could not import 'Solution' class. Ensure you have not changed the class name."}]))
    sys.exit(0)
except Exception as e:
    print(json.dumps([{"status": "runtime_error", "error": f"Import Error: {str(e)}"}]))
    sys.exit(0)

def run():
    # 2. Load Test Cases
    # testcases.json contains a list of objects: [{"input": {...}, "output": ...}]
    try:
        with open("testcases.json", "r") as f:
            testcases = json.load(f)
    except Exception as e:
        print(json.dumps([{"status": "system_error", "error": f"Failed to load test cases: {str(e)}"}]))
        return

    # 3. Setup
    sol = Solution()
    results = []
    
    # METHOD_NAME_PLACEHOLDER will be replaced by the Go backend before execution
    method_name = "{METHOD_NAME}"
    
    if not hasattr(sol, method_name):
        print(json.dumps([{"status": "system_error", "error": f"Method '{method_name}' not found in Solution class."}]))
        return
    
    method = getattr(sol, method_name)

    # 4. Execute Test Cases
    for i, tc in enumerate(testcases):
        inputs = tc.get("input", {})
        
        # Capture start time
        start_time = time.time()
        
        try:
            # --- THE MAGIC ---
            # Unpack dictionary as keyword arguments
            result = method(**inputs)
            # -----------------
            
            duration = (time.time() - start_time) * 1000 # milliseconds
            
            results.append({
                "status": "ok",
                "result": result,
                "time": duration
            })

        except Exception as e:
            # Capture runtime errors (IndexError, TypeError, etc.)
            results.append({
                "status": "runtime_error",
                "error": str(e),
                "traceback": traceback.format_exc()
            })

    # 5. Output Results as JSON
    # The Go backend will parse this line.
    print(json.dumps(results))

if __name__ == "__main__":
    run()
