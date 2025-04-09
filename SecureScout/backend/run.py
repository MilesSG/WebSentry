import uvicorn
import os
from pathlib import Path

if __name__ == "__main__":
    # 确保在正确的工作目录中运行
    backend_dir = Path(__file__).parent
    os.chdir(backend_dir)
    
    # 创建数据目录
    data_dir = Path("data")
    data_dir.mkdir(exist_ok=True)
    
    # 启动FastAPI应用
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    ) 