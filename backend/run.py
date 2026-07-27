import uvicorn
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
uvicorn.run("app.main:app", host="127.0.0.1", port=8001)
