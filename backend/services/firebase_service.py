import os
import firebase_admin
from firebase_admin import credentials, firestore, storage
from datetime import datetime
import uuid

# MVP mode: if env vars are missing, we might use a mock or require them.
# The user will fill these in .env later.

# --- In-Memory Mock Store for Testing without Firebase ---
MOCK_DB = [
    {
        "id": "mock-1",
        "item": "레미콘",
        "vendor": "(주) 지음아이비",
        "spec": "25-21-120",
        "quantity": "6㎥",
        "driver": "김철수",
        "process": "골조공사",
        "imageUrl": "",
        "createdAt": "2026-07-18T10:00:00Z" # 어제
    },
    {
        "id": "mock-2",
        "item": "시멘트",
        "vendor": "한국시멘트",
        "spec": "포틀랜드",
        "quantity": "100포",
        "driver": "이영희",
        "process": "조적/미장공사",
        "imageUrl": "",
        "createdAt": "2026-07-17T15:30:00Z" # 그제
    }
]
# ---------------------------------------------------------

def init_firebase():
    if not firebase_admin._apps:
        try:
            cred_path = os.environ.get("FIREBASE_CREDENTIALS_PATH")
            if cred_path and os.path.exists(cred_path):
                cred = credentials.Certificate(cred_path)
            else:
                cred = credentials.ApplicationDefault()
                
            bucket_name = os.environ.get("FIREBASE_STORAGE_BUCKET")
            if bucket_name:
                firebase_admin.initialize_app(cred, {
                    'storageBucket': bucket_name
                })
                print("Firebase initialized successfully.")
            else:
                print("No FIREBASE_STORAGE_BUCKET provided, using mock DB.")
        except Exception as e:
            print(f"Firebase initialization failed: {e}. Using mock DB.")
            pass

def get_db():
    try:
        if not firebase_admin._apps:
            return None
        return firestore.client()
    except Exception:
        return None

def get_bucket():
    try:
        if not firebase_admin._apps:
            return None
        return storage.bucket()
    except Exception:
        return None

def save_receipt(data: dict, image_url: str):
    db = get_db()
    if not db:
        # Fallback to Mock DB
        receipt_id = str(uuid.uuid4())
        receipt_data = {
            "id": receipt_id,
            "item": data.get("item", ""),
            "vendor": data.get("vendor", ""),
            "spec": data.get("spec", ""),
            "quantity": data.get("quantity", ""),
            "driver": data.get("driver", ""),
            "process": data.get("process", ""),
            "imageUrl": image_url,
            "createdAt": datetime.now().isoformat()
        }
        MOCK_DB.append(receipt_data)
        return receipt_data
    
    doc_ref = db.collection('receipts').document()
    receipt_id = doc_ref.id
    
    receipt_data = {
        "id": receipt_id,
        "item": data.get("item", ""),
        "vendor": data.get("vendor", ""),
        "spec": data.get("spec", ""),
        "quantity": data.get("quantity", ""),
        "driver": data.get("driver", ""),
        "process": data.get("process", ""),
        "imageUrl": image_url,
        "createdAt": firestore.SERVER_TIMESTAMP
    }
    
    doc_ref.set(receipt_data)
    return receipt_data

def get_receipts(process=None, item=None, date_from=None, date_to=None):
    db = get_db()
    if not db:
        # Fallback to Mock DB
        results = MOCK_DB.copy()
        if process:
            results = [r for r in results if r["process"] == process]
        if item:
            results = [r for r in results if r["item"] == item]
        results.sort(key=lambda x: x.get('createdAt', ''), reverse=True)
        return results
        
    query = db.collection('receipts')
    
    if process:
        query = query.where('process', '==', process)
    if item:
        query = query.where('item', '==', item)
        
    docs = query.stream()
    results = []
    for doc in docs:
        data = doc.to_dict()
        results.append(data)
        
    results.sort(key=lambda x: x.get('createdAt', datetime.min) if isinstance(x.get('createdAt'), datetime) else datetime.min, reverse=True)
    
    return results

def get_receipt(receipt_id: str):
    db = get_db()
    if not db:
        for r in MOCK_DB:
            if r["id"] == receipt_id:
                return r
        return None
        
    doc = db.collection('receipts').document(receipt_id).get()
    if doc.exists:
        return doc.to_dict()
    return None

def delete_receipt(receipt_id: str):
    db = get_db()
    if not db:
        global MOCK_DB
        initial_len = len(MOCK_DB)
        MOCK_DB = [r for r in MOCK_DB if r["id"] != receipt_id]
        return len(MOCK_DB) < initial_len
        
    doc_ref = db.collection('receipts').document(receipt_id)
    doc = doc_ref.get()
    
    if doc.exists:
        doc_ref.delete()
        return True
    return False

def upload_image(file_bytes: bytes, filename: str, content_type: str, request=None):
    bucket = get_bucket()
    if not bucket:
        # Save to local uploads directory
        unique_filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{filename}"
        filepath = os.path.join(os.path.dirname(__file__), '..', 'uploads', unique_filename)
        with open(filepath, 'wb') as f:
            f.write(file_bytes)
            
        if request:
            # Construct absolute URL using request
            return str(request.url_for('uploads', path=unique_filename))
        return f"/uploads/{unique_filename}"
        
    unique_filename = f"receipts/{datetime.now().strftime('%Y%m%d%H%M%S')}_{filename}"
    blob = bucket.blob(unique_filename)
    
    blob.upload_from_string(file_bytes, content_type=content_type)
    blob.make_public()
    
    return blob.public_url
