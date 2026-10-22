ml service run

cd .\ml-service\
.\venv\Scripts\Activate.ps1              
uvicorn app.main:app --reload --port 8000

backend run

cd .\backend\
npm run dev