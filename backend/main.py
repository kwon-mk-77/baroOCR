from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from dotenv import load_dotenv

import os
# Load env vars from .env file (one level up)
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

from services.supabase_service import init_supabase, save_receipt, get_receipts, get_receipt, delete_receipt, upload_image
from services.ocr_service import process_receipt_image
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="BaroInsu MVP Backend")

# Mount uploads dir if exists, otherwise create it
uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
if not os.path.exists(uploads_dir):
    os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Allow CORS for local React dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    init_supabase()

@app.post("/api/ocr")
async def ocr_endpoint(image: UploadFile = File(...)):
    if not image:
        raise HTTPException(status_code=400, detail="No image provided")
    
    try:
        contents = await image.read()
        parsed_data = await process_receipt_image(contents, image.filename, image.content_type)
        return parsed_data
    except Exception as e:
        print(f"OCR Error: {e}")
        # In MVP, if OCR fails (e.g. no API key), return a mock to allow flow to continue
        return {
            "item": "수동입력(OCR오류)",
            "vendor": "",
            "spec": "",
            "quantity": "",
            "driver": ""
        }

@app.post("/api/receipts")
async def create_receipt(
    item: str = Form(...),
    vendor: str = Form(...),
    quantity: str = Form(...),
    process: str = Form(...),
    spec: Optional[str] = Form(""),
    driver: Optional[str] = Form(""),
    image: UploadFile = File(...),
    request: Request = None
):
    try:
        # 1. Upload Image to Storage
        contents = await image.read()
        image_url = upload_image(contents, image.filename, image.content_type, request=request)
        
        # 2. Save data to Firestore
        data = {
            "item": item,
            "vendor": vendor,
            "spec": spec,
            "quantity": quantity,
            "driver": driver,
            "process": process
        }
        
        saved = save_receipt(data, image_url)
        return {"status": "success", "data": saved}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/receipts")
async def list_receipts(process: Optional[str] = None, item: Optional[str] = None):
    try:
        receipts = get_receipts(process=process, item=item)
        return receipts
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/receipts/{receipt_id}")
async def get_single_receipt(receipt_id: str):
    try:
        receipt = get_receipt(receipt_id)
        if not receipt:
            raise HTTPException(status_code=404, detail="Receipt not found")
        return receipt
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/receipts/{receipt_id}")
async def delete_single_receipt(receipt_id: str):
    try:
        success = delete_receipt(receipt_id)
        if not success:
            raise HTTPException(status_code=404, detail="Receipt not found or delete failed")
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
